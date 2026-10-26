"use client";

const MAX_REPORTS_PER_PAGE = 5;
const reported = new Set<string>();

/**
 * Sends one browser error to `/api/client-errors`, at most once per distinct error and
 * a handful of times per page load. Reporting never throws and never blocks the page.
 */
export function reportClientError(error: unknown, context?: Record<string, string>): void {
  if (typeof window === "undefined" || reported.size >= MAX_REPORTS_PER_PAGE) return;
  const normalized = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");
  const signature = `${normalized.name}:${normalized.message}:${normalized.stack?.split("\n", 2)[1] ?? ""}`;
  if (reported.has(signature)) return;
  reported.add(signature);
  const body = JSON.stringify({
    message: normalized.message,
    name: normalized.name,
    stack: normalized.stack,
    // Only the path: queries can hold reset or share tokens.
    path: window.location.pathname,
    digest: (normalized as Error & { digest?: string }).digest,
    context,
  });
  try {
    if (navigator.sendBeacon?.("/api/client-errors", new Blob([body], { type: "application/json" }))) return;
  } catch {
    // Fall through to fetch.
  }
  void fetch("/api/client-errors", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } }).catch(() => undefined);
}
