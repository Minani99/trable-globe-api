import { expect, test } from "@playwright/test";

test("MapTiler 지도를 안전한 MapLibre 렌더러로 열고 높이를 유지한다", async ({ page }) => {
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

  await page.route("**/api/maps/config", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { provider: "maptiler", maptilerApiKey: "test-map-key" },
        message: null,
      }),
    });
  });
  await page.route("https://api.maptiler.com/maps/streets-v4/style.json?**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: 8, sources: {}, layers: [] }),
    });
  });

  await page.goto("/studio/travels/new");
  await page.getByRole("tab", { name: "일정", exact: true }).click();
  await page.getByRole("button", { name: /장소를 추가하세요.*편집/ }).click();
  const openMap = page.getByRole("button", { name: /지도에서 직접 찾기/ });
  await expect(openMap).toBeVisible();
  await openMap.click();
  await expect(page.getByRole("dialog", { name: "지도에서 위치 조정" })).toBeVisible();
  await expect(page.locator(".place-map-dialog__provider-map .maplibregl-canvas")).toBeVisible();
  await page.getByRole("button", { name: "지도 닫기" }).click();

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
