const HEALTH_URL = "https://travel-globe-api-cexs.onrender.com/api/health";

async function checkBackend() {
  const response = await fetch(HEALTH_URL, {
    headers: { Accept: "application/json" },
  });
  const body = await response.text();

  if (!response.ok || !body.includes('"status":"UP"')) {
    throw new Error(`Render health check failed (${response.status}): ${body.slice(0, 200)}`);
  }

  return body;
}

export default {
  async fetch() {
    try {
      const body = await checkBackend();
      return new Response(body, {
        headers: { "Content-Type": "application/json; charset=utf-8" },
      });
    } catch (error) {
      return Response.json(
        { status: "DOWN", message: error instanceof Error ? error.message : "Health check failed" },
        { status: 502 },
      );
    }
  },

  async scheduled(_controller, _env, ctx) {
    ctx.waitUntil(checkBackend());
  },
};
