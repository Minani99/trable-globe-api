const HEALTH_URL = "https://travel-globe-api-cexs.onrender.com/api/health";
const SAMPLE_PROFILE_URL = "https://travel-globe-api-cexs.onrender.com/api/profiles/traveler";

async function requestJson(url, expected, fetcher = fetch) {
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Render check failed (${response.status}): ${body.slice(0, 200)}`);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    throw new Error(`Render returned invalid JSON: ${body.slice(0, 200)}`);
  }

  if (!expected(payload)) {
    throw new Error(`Render returned an unexpected payload: ${body.slice(0, 200)}`);
  }

  return payload;
}

export async function checkBackend(fetcher = fetch) {
  const health = await requestJson(
    HEALTH_URL,
    (payload) => payload?.success === true && payload?.data?.status === "UP" && payload?.data?.database === "UP",
    fetcher,
  );
  const profile = await requestJson(
    SAMPLE_PROFILE_URL,
    (payload) => payload?.success === true && payload?.data?.username === "traveler",
    fetcher,
  );

  return {
    status: health.data.status,
    database: health.data.database,
    profile: profile.data.username,
    checkedAt: new Date().toISOString(),
  };
}

export default {
  async fetch() {
    try {
      return Response.json(await checkBackend());
    } catch (error) {
      return Response.json(
        { status: "DOWN", message: error instanceof Error ? error.message : "Health check failed" },
        { status: 502 },
      );
    }
  },

  async scheduled(_controller, _env, ctx) {
    ctx.waitUntil(
      checkBackend().then((result) => console.log("Render beta probe passed", result)),
    );
  },
};
