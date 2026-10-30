import { expect, test } from "@playwright/test";
import { apiMutation, apiSessionGet, readEnvelope } from "../src/lib/api/client";

const originalFetch = globalThis.fetch;
test.afterEach(() => { globalThis.fetch = originalFetch; });

test("malformed success responses cannot masquerade as data", async () => {
  for (const body of [{ success: true }, { success: "true", data: [] }, [], null]) {
    expect(await readEnvelope(Response.json(body))).toBeNull();
  }
  globalThis.fetch = async () => Response.json({ success: true });
  await expect(apiSessionGet("/test")).rejects.toMatchObject({ name: "ApiError" });
  globalThis.fetch = async () => Response.json({ success: true, data: null });
  await expect(apiSessionGet("/test")).rejects.toThrow("응답 본문이 비어 있습니다");
  await expect(apiMutation("/test", "DELETE")).resolves.toBeNull();
});

test("caller cancellation reaches fetch without becoming a network error", async () => {
  let requestSignal: AbortSignal | null | undefined;
  globalThis.fetch = async (_input, init) => {
    requestSignal = init?.signal;
    return new Promise<Response>((_resolve, reject) => {
      requestSignal?.addEventListener("abort", () => reject(requestSignal?.reason), { once: true });
    });
  };
  const controller = new AbortController();
  const request = apiSessionGet("/test", { signal: controller.signal });
  controller.abort();
  await expect(request).rejects.toMatchObject({ name: "AbortError" });
  expect(requestSignal?.aborted).toBe(true);
});

test("network failure is recoverable and error responses retain request IDs", async () => {
  globalThis.fetch = async () => { throw new TypeError("network disconnected"); };
  await expect(apiSessionGet("/test")).rejects.toMatchObject({ status: 0 });
  globalThis.fetch = async () => Response.json({ success: false, data: null, message: "다시 시도", error: { code: "UNAVAILABLE" } }, { status: 503, headers: { "x-request-id": "test-request" } });
  await expect(apiSessionGet("/test")).rejects.toMatchObject({ status: 503, code: "UNAVAILABLE", requestId: "test-request" });
});
