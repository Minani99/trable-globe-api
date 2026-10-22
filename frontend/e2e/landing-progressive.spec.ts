import { expect, test } from "@playwright/test";

test("여행 기록이 늦거나 실패해도 지구본 통계는 먼저 표시된다", async ({ page }) => {
  await page.route("**/api/auth/me", route => route.fulfill({ json: { success: true, data: null } }));
  await page.route("**/api/profiles/traveler", route => route.fulfill({ json: { success: true, data: {
    username: "traveler", displayName: "샘플 여행자", statistics: { countryCount: 7, travelCount: 12, placeCount: 30 },
  } } }));
  await page.route("**/api/profiles/traveler/countries", route => route.fulfill({ json: { success: true, data: [] } }));
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requested = false;
  await page.route("**/api/profiles/traveler/travels", async route => {
    requested = true;
    await gate;
    await route.fulfill({ status: 503, json: { success: false, data: null, message: "Unavailable" } });
  });
  const failedHistory = page.waitForResponse(response => response.url().endsWith("/api/profiles/traveler/travels") && response.status() === 503);
  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect.poll(() => requested).toBe(true);
    await expect(page.locator(".landing-world-summary__stats dd")).toHaveText(["7", "12"]);
  } finally { release(); }
  await failedHistory;
  await expect(page.locator(".landing-world-summary__stats dd")).toHaveText(["7", "12"]);
  await expect(page.getByText("샘플을 불러오지 못했습니다", { exact: true })).toHaveCount(0);
});
