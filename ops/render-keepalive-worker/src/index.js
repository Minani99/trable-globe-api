const HEALTH_URL = "https://travel-globe-api-cexs.onrender.com/api/health";
const SAMPLE_PROFILE_URL = "https://travel-globe-api-cexs.onrender.com/api/profiles/traveler";
const REQUEST_TIMEOUT_MS = 65_000;
const RETRY_DELAY_MS = 10_000;

async function requestJson(url, expected, fetcher, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(url, {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    if (!response.ok) {
      // Do not log response bodies: a proxy error page can be large or sensitive.
      if (response.body) await response.body.cancel();
      throw Object.assign(new Error(`Render check failed (${response.status})`), {
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
      });
    }
    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw Object.assign(new Error("Render returned invalid JSON"), { retryable: false });
      }
      throw error;
    }
    if (!expected(payload)) {
      throw Object.assign(new Error("Render returned an unexpected payload"), { retryable: false });
    }
    return payload;
  } finally {
    clearTimeout(timer);
  }
}

async function probe(url, expected, { fetcher, timeoutMs, attempts, sleep }) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await requestJson(url, expected, fetcher, timeoutMs);
    } catch (error) {
      if (error.retryable === false || attempt === attempts) throw error;
      await sleep(RETRY_DELAY_MS);
    }
  }
}

export async function checkBackend(fetcher = fetch, {
  checkDatabase = true,
  includeProfile = true,
  attempts = 1,
  timeoutMs = REQUEST_TIMEOUT_MS,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const options = { fetcher, timeoutMs, attempts, sleep };
  const health = await probe(
    checkDatabase ? HEALTH_URL : `${HEALTH_URL}/live`,
    (payload) => payload?.success === true && payload?.data?.status === "UP"
      && payload?.data?.database === (checkDatabase ? "UP" : "NOT_CHECKED"),
    options,
  );
  const profile = checkDatabase && includeProfile ? await probe(
    SAMPLE_PROFILE_URL,
    (payload) => payload?.success === true && payload?.data?.username === "traveler",
    options,
  ) : null;

  return {
    status: health.data.status,
    database: health.data.database,
    profile: profile?.data.username ?? "NOT_CHECKED",
    checkedAt: new Date().toISOString(),
  };
}

export default {
  async fetch() {
    try {
      return Response.json(await checkBackend(fetch, { checkDatabase: false }), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      return Response.json(
        { status: "DOWN", message: error instanceof Error ? error.message : "Health check failed" },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }
  },

  async scheduled(_controller, _env, ctx) {
    // Only keep the Java process warm. DB probes would consume Neon's free
    // compute quota while nobody is using the app. Production smoke checks DB.
    ctx.waitUntil(
      checkBackend(fetch, { checkDatabase: false, attempts: 2 })
        .then((result) => console.log("Render beta probe passed", result)),
    );
  },
};
