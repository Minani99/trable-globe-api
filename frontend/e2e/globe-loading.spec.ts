import { expect, test } from "@playwright/test";

test("지구본을 다시 열면 국가 경계 데이터를 재사용한다", async ({ page }) => {
  let requests = 0;
  await page.route("**/geo/countries.geo.json", async (route) => {
    requests += 1;
    await route.continue();
  });
  await page.goto("/");
  const globe = page.locator(".landing-globe-live [role='application']");
  await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect.poll(() => requests).toBe(1);

  await page.getByRole("link", { name: "Travel Globe 소개", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.locator(".site-wordmark").click();
  await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect(globe.locator('[data-code="JP"]')).toBeAttached();
  expect(requests).toBe(1);
});

test("국가 경계 요청 실패가 다음 지구본 진입에 남지 않는다", async ({ page }) => {
  let unavailable = true;
  let requests = 0;
  await page.route("**/geo/countries.geo.json", async (route) => {
    requests += 1;
    if (unavailable) await route.fulfill({ status: 503, body: "Unavailable" });
    else await route.continue();
  });
  await page.goto("/");
  const error = page.getByText("국가 경계 데이터를 불러오지 못했습니다.", { exact: false });
  await expect(error).toBeVisible({ timeout: 30_000 });
  const failedRequests = requests;
  unavailable = false;

  await page.getByRole("link", { name: "Travel Globe 소개", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  await page.locator(".site-wordmark").click();
  await expect(page.locator(".landing-globe-live [role='application']"))
    .toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect.poll(() => requests).toBe(failedRequests + 1);
  await expect(error).toHaveCount(0);
});
