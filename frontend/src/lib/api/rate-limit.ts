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
 * What it is not: the counters live in the instance's memory, so a request served by a
 * cold instance starts from zero and the ceiling is really "per instance". That blunts
 * a naive script and an accidental retry loop, which is the beta's threat model. Real
 * enforcement needs a shared store (Upstash, Redis) and should arrive before the service
 * is public.
 */

/** Requests per window, per IP, per action. */
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_SECONDS = 60;

const LIMIT = positiveInt(process.env.AUTH_RATE_LIMIT, DEFAULT_LIMIT);
const WINDOW_MS = positiveInt(process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS, DEFAULT_WINDOW_SECONDS) * 1000;

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
export function checkRateLimit(action: string, request: Request): RateLimitResult {
  const now = Date.now();
  const key = `${action}:${clientAddress(request)}`;

  const existing = windows.get(key);
  if (!existing || existing.resetAt <= now) {
    evictExpired(now);
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > LIMIT) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  return { allowed: true, retryAfterSeconds: 0 };
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

/** Test seam: forget every counter. */
export function resetRateLimits() {
  windows.clear();
}
