import assert from "node:assert/strict";
import test from "node:test";

import { checkBackend } from "./index.js";

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
