import { expect, test } from "@playwright/test";

// The module reads its limit once at import; set it before the first import below.
process.env.AUTH_RATE_LIMIT = "3";
process.env.AUTH_RATE_LIMIT_WINDOW_SECONDS = "60";

const loadRateLimit = () => import("../src/lib/api/rate-limit");
const request = (ip: string) => new Request("https://travel-globe.test/api/auth/login", { headers: { "x-forwarded-for": `${ip}, 10.0.0.1` } });

interface FakeStore {
  values: Map<string, number>;
  bodies: string[];
}

/** Implements the three Upstash pipeline commands the limiter sends. */
function installFakeUpstash(store: FakeStore, { fail = false } = {}) {
  process.env.UPSTASH_REDIS_REST_URL = "https://redis.test/";
  process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (fail) throw new Error("store unavailable");
    expect(String(input)).toBe("https://redis.test/pipeline");
    expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-token");
    const body = String(init?.body);
    store.bodies.push(body);
    const commands = JSON.parse(body) as string[][];
    const results = commands.map(([command, key]) => {
      if (command === "SET") {
        if (store.values.has(key)) return { result: null };
        store.values.set(key, 0);
        return { result: "OK" };
      }
      if (command === "INCR") {
        const next = (store.values.get(key) ?? 0) + 1;
        store.values.set(key, next);
        return { result: next };
      }
      return { result: 42_000 };
    });
    return Response.json(results);
  }) as typeof fetch;
}

const originalFetch = globalThis.fetch;
test.afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

test("공유 저장소가 없으면 인스턴스 메모리로 IP·동작별 횟수를 센다", async () => {
  const { checkRateLimit } = await loadRateLimit();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    expect((await checkRateLimit("memory-login", request("198.51.100.1"))).allowed).toBe(true);
  }
  const blocked = await checkRateLimit("memory-login", request("198.51.100.1"));
  expect(blocked.allowed).toBe(false);
  expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  // Another address and another action keep their own budget.
  expect((await checkRateLimit("memory-login", request("198.51.100.2"))).allowed).toBe(true);
  expect((await checkRateLimit("memory-reset", request("198.51.100.1"))).allowed).toBe(true);
});

test("Upstash가 설정되면 모든 인스턴스가 같은 카운터를 쓰고 IP 원문은 보내지 않는다", async () => {
  const { checkRateLimit } = await loadRateLimit();
  const store: FakeStore = { values: new Map(), bodies: [] };
  installFakeUpstash(store);
  const results = [];
  for (let attempt = 0; attempt < 4; attempt += 1) results.push(await checkRateLimit("shared-login", request("203.0.113.9")));
  expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
  expect(results[3].retryAfterSeconds).toBe(42);
  expect(store.values.size).toBe(1);
  expect(store.bodies.join("")).not.toContain("203.0.113.9");
  expect([...store.values.keys()][0]).toMatch(/^travel-globe:rate-limit:[0-9a-f]{64}$/);
});

test("공유 저장소가 응답하지 않아도 로그인을 막지 않고 메모리 제한으로 대신한다", async () => {
  const { checkRateLimit } = await loadRateLimit();
  installFakeUpstash({ values: new Map(), bodies: [] }, { fail: true });
  const results = [];
  for (let attempt = 0; attempt < 4; attempt += 1) results.push(await checkRateLimit("fallback-login", request("192.0.2.7")));
  expect(results.map((result) => result.allowed)).toEqual([true, true, true, false]);
});
