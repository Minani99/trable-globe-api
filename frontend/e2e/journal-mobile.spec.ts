import { expect, test } from "@playwright/test";

test("여행 사진은 모바일에서 로드되고 로그인 동작을 가리지 않는다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const photo = page.locator(".landing-postcard img");
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("journal-home-mobile.png"), fullPage: true });
  await page.goto("/login?next=%2Fstudio");
  await expect(page.locator(".auth-scene img")).toBeVisible();
  await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
  const submit = page.getByRole("button", { name: "로그인하고 계속", exact: true });
  const box = (await submit.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(44);
  expect(box.y + box.height).toBeLessThan(844);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("journal-login-mobile.png"), fullPage: true });
});

test("화면 밖의 지구본은 그래픽 작업을 멈추고 다시 보이면 재개한다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const globe = page.locator(".landing-globe-live [data-rendering]");
  await expect(globe).toHaveAttribute("data-rendering", "paused", { timeout: 45000 });
  await globe.scrollIntoViewIfNeeded();
  await expect(globe).toHaveAttribute("data-rendering", "active");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await expect(globe).toHaveAttribute("data-rendering", "paused");
  await globe.scrollIntoViewIfNeeded();
  await expect(page.locator(".landing-globe-live canvas")).toBeVisible();
  await expect(globe).toHaveAttribute("data-rendering", "active");
});
