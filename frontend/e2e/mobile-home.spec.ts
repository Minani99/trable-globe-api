import { expect, test } from "@playwright/test";

test("모바일 메인은 여행 시작과 국가 탐색을 제공한다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "여행이 쌓이는, 나만의 지구본." })).toBeVisible();
  await expect(page.locator(".landing-globe-live")).toBeVisible();
  await expect(page.locator(".landing-globe-live [data-rendering]")).toHaveAttribute("data-rendering", "active");
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

for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1440, height: 960 }]) {
  test(`${viewport.width}px 첫 화면에서 지구본을 크게 보고 여행을 시작할 수 있다`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heading = page.getByRole("heading", { name: "여행이 쌓이는, 나만의 지구본." });
    const canvas = page.locator(".landing-globe-live canvas").first();
    const primaryAction = page.locator(".landing-reveal--actions").getByRole("link", { name: "계정 만들기" });
    await expect(heading).toBeVisible();
    await expect(canvas).toBeInViewport({ ratio: 0.95, timeout: 45000 });
    await expect(primaryAction).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const globeBounds = (await canvas.boundingBox())!;
    const globeFrameBounds = (await page.locator(".landing-globe-frame").boundingBox())!;
    const headingBounds = (await heading.boundingBox())!;
    const photoBounds = (await page.locator(".landing-journal .landing-postcard").boundingBox())!;
    if (viewport.width < 700) {
      const navigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
      await expect(navigation).toBeVisible();
      const navigationBounds = (await navigation.boundingBox())!;
      expect(globeBounds.width).toBeGreaterThanOrEqual(viewport.width * 0.8);
      expect(globeFrameBounds.height).toBeGreaterThanOrEqual(viewport.height * 0.43);
      expect(globeBounds.height).toBeGreaterThanOrEqual(viewport.height * 0.28);
      expect(globeBounds.y).toBeGreaterThan(headingBounds.y + headingBounds.height);
      expect(globeBounds.y + globeBounds.height).toBeLessThanOrEqual(navigationBounds.y + 1);
      const actionBounds = (await primaryAction.boundingBox())!;
      expect(actionBounds.y).toBeGreaterThanOrEqual(globeBounds.y + globeBounds.height);
      expect(photoBounds.y).toBeGreaterThan(actionBounds.y + actionBounds.height);
    } else {
      expect(globeBounds.width).toBeGreaterThanOrEqual(viewport.width * 0.35);
      expect(globeBounds.height).toBeGreaterThanOrEqual(viewport.height * 0.5);
      expect(globeBounds.x).toBeGreaterThan(headingBounds.x + headingBounds.width);
      expect(photoBounds.y).toBeGreaterThan(globeBounds.y + globeBounds.height);
      expect(photoBounds.height).toBeLessThan(globeBounds.height * 0.6);
    }
    await page.screenshot({ path: testInfo.outputPath(`globe-first-${viewport.width}.png`), fullPage: false });
    // Opening the account flow also checks that a fixed mobile menu cannot intercept the CTA.
    await primaryAction.click();
    await expect(page).toHaveURL(/\/register\?next=%2Fstudio$/);
  });
}
