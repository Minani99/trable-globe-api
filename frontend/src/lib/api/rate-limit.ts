import "server-only";

/**
 * Per-IP throttling for the authentication endpoints.
 *
 * This lives in the BFF rather than the Spring API because it is the only place that
 * sees the real caller: browser requests reach the backend through this proxy, so from
 * there every visitor shares one address and an IP-keyed limit would either be useless
 * or lock out everyone at once.
 *
 * What it is for: sign-in is the one endpoint where guessing pays, and each attempt
 * costs a 310,000-round PBKDF2 verification on a 0.1-CPU instance. A few hundred
 * attempts a minute is a password guessing run and a way to stall the whole service.
 *
 * Where the counters live: with Upstash Redis configured (`UPSTASH_REDIS_REST_URL` and
 * `UPSTASH_REDIS_REST_TOKEN`, or the `KV_REST_API_*` names the Vercel integration sets)
 * every serverless instance shares one counter per caller, so the limit holds however
 * many instances are serving. Without it, or when the store does not answer in time,
 * the counters fall back to this instance's memory: a per-instance speed bump rather
 * than a shared ceiling, and never a reason to refuse a sign-in.
 */

/** Requests per window, per IP, per action. */
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SECONDS = 60;

const LIMIT = positiveInt(process.env.AUTH_RATE_LIMIT, DEFAULT_LIMIT);
const WINDOW_MS = positiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS) * 1000;

/** A slow store must not hold up sign-in; past this the in-memory counter decides. */
const SHARED_STORE_TIMEOUT_MS = 800;
const SHARED_KEY_PREFIX = "travel-globe:rate-limit:";

/** Stop the map from growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 10_000;

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Records an attempt and reports whether it may proceed.
 *
 * @param action separate bucket per action, so failing to sign in never blocks a reset
 * @param request used only to read the caller's address
 */
export async function checkRateLimit(action: string, request: Request): Promise<RateLimitResult> {
  const key = `${action}:${clientAddress(request)}`;
  const shared = sharedStore();
  if (shared) {
    const result = await checkSharedLimit(shared, key).catch(() => null);
    if (result) return result;
  }
  return checkMemoryLimit(key);
}

function checkMemoryLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    evictExpired(now);
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  return limitResult(existing.count, existing.resetAt - now);
}

function limitResult(count: number, remainingMs: number): RateLimitResult {
  if (count > LIMIT) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remainingMs / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

interface SharedStore {
  url: string;
  token: string;
}

function sharedStore(): SharedStore | null {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL)?.trim().replace(/\/+$/, "");
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN)?.trim();
  return url && token ? { url, token } : null;
}

/**
 * One round trip: start the window if this is the first attempt, count this attempt and
 * read how long the window has left. Keys hold a hash of the address, never the address.
 */
async function checkSharedLimit(store: SharedStore, key: string): Promise<RateLimitResult | null> {
  const storeKey = `${SHARED_KEY_PREFIX}${await sha256(key)}`;
  const response = await fetch(`${store.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${store.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["SET", storeKey, "0", "PX", String(WINDOW_MS), "NX"],
      ["INCR", storeKey],
      ["PTTL", storeKey],
    ]),
    cache: "no-store",
    signal: AbortSignal.timeout(SHARED_STORE_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const replies = (await response.json()) as Array<{ result?: unknown; error?: string }>;
  const count = Number(replies[1]?.result);
  const remainingMs = Number(replies[2]?.result);
  if (!Number.isFinite(count) || count < 1) return null;
  return limitResult(count, remainingMs > 0 ? remainingMs : WINDOW_MS);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * The caller's address as the platform reports it.
 *
 * `x-forwarded-for` is set by the edge in front of this function, so the first entry is
 * the client. Callers cannot forge it into something useful - an attacker rotating the
 * header only spreads their own attempts across buckets, which is why this is a speed
 * bump rather than a control.
 */
function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function evictExpired(now: number) {
  if (windows.size < MAX_TRACKED_KEYS) {
    return;
  }
  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key);
    }
  }
  // Still full of live windows: drop the oldest rather than grow forever.
  if (windows.size >= MAX_TRACKED_KEYS) {
    const oldest = [...windows.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
    for (const [key] of oldest.slice(0, Math.floor(MAX_TRACKED_KEYS / 4))) {
      windows.delete(key);
    }
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
