import { expect, test } from "@playwright/test";

test("모바일 메인은 한 화면 안에서 탐색과 국가 선택을 제공한다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "여행할수록, 나만의 세계가 만들어집니다." })).toBeVisible();
  await expect(page.locator(".landing-globe-live")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator(".landing-globe-live [data-render-quality='mobile']")).toHaveAttribute("data-pixel-ratio-limit", "1.25");

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

  const guideTrigger = page.getByRole("button", { name: /30초 안내|이용 방법/ });
  await expect(guideTrigger).toBeVisible();
  await guideTrigger.click();
  const guide = page.getByRole("dialog", { name: "여행 하나가 나의 세계가 되기까지" });
  await expect(guide).toBeVisible();
  await expect(guide.getByRole("listitem")).toHaveCount(3);
  await guide.getByRole("button", { name: "알겠어요, 시작할게요" }).click();

  const globeCanvas = page.locator(".landing-globe-live canvas").first();
  await expect(globeCanvas).toBeVisible();
  const globeBounds = await globeCanvas.boundingBox();
  expect(globeBounds).not.toBeNull();
  // World mode has no personal journey pins. Select the country currently centered
  // on the sphere, which follows the same mobile tap path as a visitor.
  await globeCanvas.click({
    position: { x: globeBounds!.width / 2, y: globeBounds!.height / 2 },
  });
  await expect(page.locator(".landing-landmark-card__action")).toBeVisible();
  expect(pageErrors).toEqual([]);
});
