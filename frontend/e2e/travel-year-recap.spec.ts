import { expect, test } from "@playwright/test";

test("연도를 고르면 지구본과 기록, 개인 여행 리캡이 함께 바뀐다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const yearFilter = page.getByRole("group", { name: "여행 연도 필터" });
  const countryList = page.getByRole("navigation", { name: "방문한 국가 목록" });
  await expect(yearFilter).toBeVisible();
  await expect(page.getByRole("heading", { name: "지금까지, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(5);

  await yearFilter.getByRole("button", { name: "2026" }).click();
  await expect(page.getByRole("heading", { name: "2026년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(2);
  await expect(countryList.getByRole("button", { name: /대만/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /일본/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /미국/ })).toHaveCount(0);
  await expect(page.locator("#timeline-2026")).toBeVisible();
  await expect(page.locator("#timeline-2025")).toHaveCount(0);

  await yearFilter.getByRole("button", { name: "2025" }).click();
  await expect(page.getByRole("heading", { name: "2025년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(3);
  await expect(countryList.getByRole("button", { name: /미국/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /대만/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "2025 전체" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});
