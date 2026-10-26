import { expect, test } from "@playwright/test";

import { buildSentryEnvelope, pathOnly, sanitizeErrorReport } from "../src/lib/error-reporting";

test("오류 기록은 경로의 검색어·토큰을 버리고 길이를 제한한다", () => {
  expect(pathOnly("/reset-password?token=secret#done")).toBe("/reset-password");
  expect(pathOnly("https://elsewhere.test/x")).toBeUndefined();
  const report = sanitizeErrorReport({
    message: `  ${"x".repeat(900)}  `,
    stack: "Error\n    at a",
    path: "/share/abc?ref=mail",
    context: { kind: "route-error", ignored: 42 },
    unexpected: "dropped",
  }, "client");
  expect(report).toMatchObject({ source: "client", path: "/share/abc", stack: "Error\n    at a", context: { kind: "route-error" } });
  expect(report!.message).toHaveLength(500);
  expect(report).not.toHaveProperty("unexpected");
  expect(sanitizeErrorReport({ message: "   " }, "client")).toBeNull();
  expect(sanitizeErrorReport("not an object", "client")).toBeNull();
});

test("Sentry DSN으로 봉투 주소·인증·이벤트를 만든다", () => {
  const envelope = buildSentryEnvelope("https://publickey@o1.ingest.sentry.io/4505", {
    source: "client", message: "boom", name: "TypeError", path: "/studio", context: { kind: "window-error" },
  }, { release: "abc123", environment: "production", now: new Date("2099-01-01T00:00:00Z"), eventId: "e".repeat(32) })!;
  expect(envelope.url).toBe("https://o1.ingest.sentry.io/api/4505/envelope/");
  expect(envelope.auth).toContain("sentry_key=publickey");
  const [header, item, event] = envelope.body.split("\n").map((line) => JSON.parse(line));
  expect(header).toEqual({ event_id: "e".repeat(32), sent_at: "2099-01-01T00:00:00.000Z" });
  expect(item).toEqual({ type: "event" });
  expect(event).toMatchObject({
    level: "error", release: "abc123", environment: "production",
    tags: { source: "client", kind: "window-error" },
    request: { url: "/studio" },
    exception: { values: [{ type: "TypeError", value: "boom" }] },
  });
  expect(buildSentryEnvelope("not a dsn", { source: "server", message: "x" }, { release: "r", environment: "e" })).toBeNull();
});
