import { expect, test } from "@playwright/test";

for (const viewport of [
  { name: "compact-mobile", width: 360, height: 640 },
  { name: "mobile", width: 390, height: 844 },
  { name: "short-desktop", width: 1280, height: 720 },
]) {
  test(`지구본 UI가 화면과 카드 경계를 벗어나지 않는다 - ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/globe");
    const card = page.locator(".profile-globe-card");
    const globe = card.locator("[role='application']");
    await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

    const cardBox = await card.boundingBox();
    expect(cardBox).not.toBeNull();
    for (const selector of [".globe-view-controls", ".globe-time-controls"]) {
      const element = card.locator(selector);
      await expect(element).toBeVisible();
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(cardBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width + 1);
      expect(box!.y).toBeGreaterThanOrEqual(cardBox!.y - 1);
      expect(box!.y + box!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + 1);
    }

    if (viewport.width <= 560) {
      await expect(page.getByRole("combobox", { name: "여행 연도" })).toBeVisible();
      await expect(page.locator(".travel-year-filter__options")).toBeHidden();
      const mobileNavigation = await page.getByRole("navigation", { name: "모바일 주요 메뉴" }).boundingBox();
      expect(mobileNavigation).not.toBeNull();
      expect(cardBox!.y + cardBox!.height).toBeLessThanOrEqual(mobileNavigation!.y + 1);
    } else {
      await expect(page.getByRole("button", { name: "2026" })).toBeVisible();
    }

    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}.png`), fullPage: true });
  });
}
