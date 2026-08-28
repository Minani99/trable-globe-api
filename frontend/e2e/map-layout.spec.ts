import { expect, test } from "@playwright/test";

test("MapTiler 컨테이너가 SDK 기본 스타일에도 높이를 유지한다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `map_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "지도 확인 여행자",
      email: `${username}@example.com`,
      password: "map-layout-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.goto("/studio/travels/new");
  await expect(page.getByRole("button", { name: /지도에서 직접 찾기/ })).toBeVisible();

  const fixture = page.locator("[data-map-layout-fixture]");
  await page.evaluate(() => {
    const viewport = document.createElement("div");
    viewport.dataset.mapLayoutFixture = "true";
    viewport.className = "place-map-dialog__canvas";
    viewport.style.width = "640px";
    viewport.style.height = "420px";

    const provider = document.createElement("div");
    provider.className = "place-map-dialog__provider-map maplibregl-map";
    viewport.append(provider);
    document.body.append(viewport);
  });

  await expect(fixture.locator(".place-map-dialog__provider-map")).toHaveCSS("position", "absolute");
  await expect(fixture.locator(".place-map-dialog__provider-map")).toHaveCSS("height", "420px");
});
