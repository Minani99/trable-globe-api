import { expect, test } from "@playwright/test";
import { getUploadConfiguration, uploadPhoto } from "../src/lib/uploads/client";

test("upload settings use a bounded request and reject malformed responses", async () => {
  const originalFetch = globalThis.fetch;
  let signal: AbortSignal | null | undefined;
  try {
    globalThis.fetch = async (_input, init) => {
      signal = init?.signal;
      return Response.json({ success: true });
    };
    await expect(getUploadConfiguration()).rejects.toMatchObject({ name: "ApiError" });
    expect(signal).toBeInstanceOf(AbortSignal);
    globalThis.fetch = async () => { throw new TypeError("connection lost"); };
    await expect(getUploadConfiguration()).rejects.toMatchObject({ status: 0 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a stalled upload rejects and a subsequent upload can succeed", async () => {
  const originalFetch = globalThis.fetch;
  const originalXHR = Object.getOwnPropertyDescriptor(globalThis, "XMLHttpRequest");
  let shouldTimeout = true;
  const requests: FakeXHR[] = [];
  class FakeXHR {
    timeout = 0;
    status = 200;
    upload = {};
    ontimeout?: () => void;
    onload?: () => void;
    open() {}
    setRequestHeader() {}
    send() {
      requests.push(this);
      queueMicrotask(() => shouldTimeout ? this.ontimeout?.() : this.onload?.());
    }
  }
  try {
    Object.defineProperty(globalThis, "XMLHttpRequest", { configurable: true, value: FakeXHR });
    globalThis.fetch = async () => Response.json({ success: true, data: {
      objectKey: "photo.png", uploadUrl: "https://upload.example.test/photo.png",
      publicUrl: "https://photos.example.test/photo.png", expiresInSeconds: 300,
    } });
    const file = new File([new Uint8Array([1])], "photo.png", { type: "image/png" });
    await expect(uploadPhoto(file, () => {})).rejects.toMatchObject({ status: 0, message: expect.stringContaining("시간이 초과") });
    expect(requests[0].timeout).toBe(120_000);
    shouldTimeout = false;
    const progress: number[] = [];
    await expect(uploadPhoto(file, value => progress.push(value))).resolves.toMatchObject({ objectKey: "photo.png" });
    expect(progress.at(-1)).toBe(100);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalXHR) Object.defineProperty(globalThis, "XMLHttpRequest", originalXHR);
    else Reflect.deleteProperty(globalThis, "XMLHttpRequest");
  }
});
