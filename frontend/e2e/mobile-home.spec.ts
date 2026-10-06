import { expect, test } from "@playwright/test";

test("모바일 메인은 여행 시작과 국가 탐색을 제공한다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "다음 여행을 펼쳐보세요." })).toBeVisible();
  await expect(page.locator(".landing-globe-live")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator(".landing-globe-live [data-render-quality='mobile']")).toHaveAttribute("data-pixel-ratio-limit", "1.25");

  const layout = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    documentWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

  const bottomNavigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(bottomNavigation).toBeVisible();
  await expect(bottomNavigation.getByRole("link")).toHaveCount(4);
  await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeHidden();
  await expect(page.getByRole("region", { name: "계획과 기록", includeHidden: true })).toBeHidden();

  const globeCanvas = page.locator(".landing-globe-live canvas").first();
  await expect(globeCanvas).toBeVisible();
  const globeBounds = await globeCanvas.boundingBox();
  expect(globeBounds).not.toBeNull();
  // World mode has no personal journey pins. Select the country currently centered
  // on the sphere, which follows the same mobile tap path as a visitor.
  const visibleMarker = page.locator(".landing-globe-live .tg-marker:visible").first();
  if (await visibleMarker.count()) {
    await visibleMarker.dispatchEvent("click");
  } else {
    await globeCanvas.click({
      position: { x: globeBounds!.width / 2, y: globeBounds!.height / 2 },
      force: true,
    });
  }
  await expect(page.locator(".landing-landmark-card__action")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
