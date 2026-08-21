import { expect, test } from "@playwright/test";

test("연도 링크를 열고 바꾸면 지구본, 기록, 리캡과 공유 주소가 함께 바뀐다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler?year=2025");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const yearFilter = page.getByRole("group", { name: "여행 연도 필터" });
  const countryList = page.getByRole("navigation", { name: "방문한 국가 목록" });
  await expect(yearFilter).toBeVisible();
  await expect(page).toHaveURL(/\/traveler\?year=2025$/);
  await expect(page).toHaveTitle(/2025 여행 세계/);
  await expect(yearFilter.getByRole("button", { name: "2025" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "2025년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(3);

  await yearFilter.getByRole("button", { name: "2026" }).click();
  await expect(page).toHaveURL(/\/traveler\?year=2026$/);
  await expect(page.getByRole("heading", { name: "2026년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(2);
  await expect(countryList.getByRole("button", { name: /대만/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /일본/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /미국/ })).toHaveCount(0);
  await expect(page.locator("#timeline-2026")).toBeVisible();
  await expect(page.locator("#timeline-2025")).toHaveCount(0);

  const recapShare = page.locator(".profile-share--recap");
  await recapShare.getByRole("button", { name: "2026 리캡 공유" }).click();
  await expect(recapShare.getByRole("status")).toHaveText("링크를 복사했습니다.");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("/traveler?year=2026");

  await yearFilter.getByRole("button", { name: "전체" }).click();
  await expect(page).toHaveURL(/\/traveler$/);
  await expect(page.getByRole("heading", { name: "지금까지, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(5);

  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});
