import { expect, test } from "@playwright/test";

test("모바일 메인은 한 화면 안에서 탐색과 국가 선택을 제공한다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);

  const layout = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
  }));
  expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight + 1);

  const bottomNavigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(bottomNavigation).toBeVisible();
  await expect(bottomNavigation.getByRole("link")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeHidden();
  await expect(page.locator(".landing-experience")).toBeHidden();

  const canvas = page.locator(".landing-globe-live canvas");
  await expect(canvas).toBeVisible();
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  if (bounds) {
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  }

  await expect(page.locator(".landing-landmark-card__action")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
