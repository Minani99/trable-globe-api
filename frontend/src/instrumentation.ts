import type { Instrumentation } from "next";

/**
 * Server rendering and route errors. Next.js already prints them to the server log, so
 * they are only forwarded when an error service is configured (see error-reporting.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.SENTRY_DSN) return;
  const { pathOnly, recordError } = await import("@/lib/error-reporting");
  const normalized = error instanceof Error ? error : new Error(String(error));
  await recordError({
    source: "server",
    message: normalized.message.slice(0, 500),
    name: normalized.name,
    stack: normalized.stack?.slice(0, 4000),
    path: pathOnly(request.path),
    digest: typeof error === "object" && error && "digest" in error ? String(error.digest) : undefined,
    context: { routePath: context.routePath, routeType: context.routeType },
  }, { log: false });
};
