/**
 * Error reports from the browser and from server rendering.
 *
 * Every report is written to the server log as one JSON line, which the hosting log view
 * and any log drain can search. With `SENTRY_DSN` set the same report is also forwarded
 * to Sentry through its HTTP envelope endpoint, so no SDK is bundled into the app.
 *
 * Reports carry what is needed to find a bug and nothing that identifies a traveller:
 * the page path without its query (reset and share tokens live there), the error text
 * and stack, the browser string and the release.
 */
export interface ErrorReport {
  source: "client" | "server";
  message: string;
  name?: string;
  stack?: string;
  path?: string;
  digest?: string;
  userAgent?: string;
  context?: Record<string, string>;
}

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_FIELD = 200;
const SENTRY_TIMEOUT_MS = 2_000;

/** Bounds every field and drops anything a client should not be able to inject. */
export function sanitizeErrorReport(input: unknown, source: ErrorReport["source"]): ErrorReport | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const message = text(value.message, MAX_MESSAGE);
  if (!message) return null;
  const context = value.context && typeof value.context === "object"
    ? Object.fromEntries(Object.entries(value.context as Record<string, unknown>)
      .slice(0, 8)
      .map(([key, entry]) => [key.slice(0, 40), text(entry, MAX_FIELD)])
      .filter((entry): entry is [string, string] => Boolean(entry[1])))
    : undefined;
  return {
    source,
    message,
    name: text(value.name, MAX_FIELD),
    stack: text(value.stack, MAX_STACK),
    path: pathOnly(value.path),
    digest: text(value.digest, MAX_FIELD),
    userAgent: text(value.userAgent, MAX_FIELD),
    context: context && Object.keys(context).length ? context : undefined,
  };
}

/** `/reset-password?token=…#x` → `/reset-password`. Anything that is not a path is dropped. */
export function pathOnly(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.startsWith("/")) return undefined;
  return value.split(/[?#]/, 1)[0].slice(0, MAX_FIELD);
}

export function release(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || process.env.NEXT_PUBLIC_BUILD_ID || "local";
}

export async function recordError(report: ErrorReport, { log = true }: { log?: boolean } = {}): Promise<void> {
  if (log) console.error(JSON.stringify({ type: "app_error", release: release(), ...report }));
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  const envelope = buildSentryEnvelope(dsn, report, { release: release(), environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development" });
  if (!envelope) return;
  await fetch(envelope.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-sentry-envelope", "X-Sentry-Auth": envelope.auth },
    body: envelope.body,
    cache: "no-store",
    signal: AbortSignal.timeout(SENTRY_TIMEOUT_MS),
  }).catch(() => undefined);
}

/** `https://<key>@<host>/<project>` → where and how to send a Sentry envelope. */
export function buildSentryEnvelope(
  dsn: string,
  report: ErrorReport,
  { release, environment, now = new Date(), eventId = randomEventId() }: { release: string; environment: string; now?: Date; eventId?: string },
): { url: string; auth: string; body: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(dsn);
  } catch {
    return null;
  }
  const projectId = parsed.pathname.replace(/^\/+|\/+$/g, "");
  if (!parsed.username || !projectId) return null;
  const event = {
    event_id: eventId,
    timestamp: now.getTime() / 1000,
    platform: "javascript",
    level: "error",
    release,
    environment,
    tags: { source: report.source, ...(report.context ?? {}) },
    request: report.path ? { url: report.path, headers: report.userAgent ? { "User-Agent": report.userAgent } : undefined } : undefined,
    exception: { values: [{ type: report.name || "Error", value: report.message }] },
    extra: { stack: report.stack, digest: report.digest },
  };
  return {
    url: `${parsed.protocol}//${parsed.host}/api/${projectId}/envelope/`,
    auth: `Sentry sentry_version=7, sentry_key=${parsed.username}, sentry_client=travel-globe/1.0`,
    body: [
      JSON.stringify({ event_id: eventId, sent_at: now.toISOString() }),
      JSON.stringify({ type: "event" }),
      JSON.stringify(event),
    ].join("\n"),
  };
}

function text(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : undefined;
}

function randomEventId(): string {
  return crypto.randomUUID().replace(/-/g, "");
}
