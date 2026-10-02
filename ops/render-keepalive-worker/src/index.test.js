import assert from "node:assert/strict";
import test from "node:test";

import worker, { checkBackend } from "./index.js";

function response(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("accepts a healthy database and the expected public profile", async () => {
  const requestedUrls = [];
  const fetcher = async (url) => {
    requestedUrls.push(url);
    if (url.endsWith("/api/health")) {
      return response({ success: true, data: { status: "UP", database: "UP" } });
    }
    return response({ success: true, data: { username: "traveler" } });
  };

  const result = await checkBackend(fetcher);

  assert.equal(result.status, "UP");
  assert.equal(result.database, "UP");
  assert.equal(result.profile, "traveler");
  assert.equal(requestedUrls.length, 2);
});

test("fails when readiness is up but the database is down", async () => {
  const fetcher = async () =>
    response({ success: true, data: { status: "UP", database: "DOWN" } });

  await assert.rejects(() => checkBackend(fetcher), /unexpected payload/);
});

test("fails when the sample profile cannot be served", async () => {
  const fetcher = async (url) => {
    if (url.endsWith("/api/health")) {
      return response({ success: true, data: { status: "UP", database: "UP" } });
    }
    return response({ success: false, data: null }, 404);
  };

  await assert.rejects(() => checkBackend(fetcher), /Render check failed \(404\)/);
});

test("routine keepalive reads only readiness and bypasses caches", async () => {
  const requests = [];
  const result = await checkBackend(async (url, options) => {
    requests.push(url);
    assert.equal(options.headers["Cache-Control"], "no-cache");
    assert.ok(options.signal instanceof AbortSignal);
    return response({ success: true, data: { status: "UP", database: "UP" } });
  }, { includeProfile: false });
  assert.equal(result.profile, "NOT_CHECKED");
  assert.equal(requests.length, 1);
  assert.ok(requests[0].endsWith("/api/health"));
});

test("retries a temporary restart once with a delay", async () => {
  let calls = 0;
  const delays = [];
  const result = await checkBackend(async () => {
    calls++;
    return calls === 1 ? response({}, 503)
      : response({ success: true, data: { status: "UP", database: "UP" } });
  }, { includeProfile: false, attempts: 2, sleep: async (ms) => delays.push(ms) });
  assert.equal(result.status, "UP");
  assert.equal(calls, 2);
  assert.deepEqual(delays, [10_000]);
});

test("aborts a stalled response body and stops after the retry budget", async () => {
  let calls = 0;
  const fetcher = async (_url, { signal }) => {
    calls++;
    return {
      ok: true,
      json: () => new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(new DOMException("Timed out", "AbortError")), { once: true });
      }),
    };
  };
  await assert.rejects(() => checkBackend(fetcher, {
    includeProfile: false, attempts: 2, timeoutMs: 5, sleep: async () => {},
  }), { name: "AbortError" });
  assert.equal(calls, 2);
});

test("does not retry permanent HTTP or malformed payload failures", async () => {
  for (const makeResponse of [
    () => response({}, 404),
    () => new Response("not JSON"),
    () => response({ success: true, data: { status: "UP", database: "DOWN" } }),
  ]) {
    let calls = 0;
    await assert.rejects(() => checkBackend(async () => {
      calls++;
      return makeResponse();
    }, { attempts: 2, sleep: async () => assert.fail("unexpected retry") }));
    assert.equal(calls, 1);
  }
});

test("scheduled pings never wake the database, including half-hour boundaries", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    assert.ok(url.endsWith("/api/health/live"));
    return response({ success: true, data: { status: "UP", database: "NOT_CHECKED" } });
  });
  t.mock.method(console, "log", () => {});
  for (const minute of [0, 5, 30, 55]) {
    requests.length = 0;
    let pending;
    await worker.scheduled({ scheduledTime: Date.UTC(2026, 9, 1, 7, minute) }, {}, {
      waitUntil: (promise) => { pending = promise; },
    });
    await pending;
    assert.equal(requests.length, 1);
  }
});

test("public Worker endpoint does not wake DB and cannot be cached", async (t) => {
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.ok(url.endsWith("/api/health/live"));
    return response({ success: true, data: { status: "UP", database: "NOT_CHECKED" } });
  });
  const result = await worker.fetch();
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("Cache-Control"), "no-store");
  assert.equal((await result.json()).database, "NOT_CHECKED");
});
