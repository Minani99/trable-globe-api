import { expect, test } from "@playwright/test";

const publicRoutes = ["/", "/about", "/discover", "/login", "/register", "/feedback", "/privacy", "/terms"];

for (const path of publicRoutes) {
  test(`모바일 공통 레이아웃이 읽기 쉽고 화면을 넘지 않는다 - ${path}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const layout = await page.evaluate(() => ({
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      headingSize: Number.parseFloat(getComputedStyle(document.querySelector("main h1")!).fontSize),
      inputSizes: Array.from(document.querySelectorAll("main input, main select, main textarea"))
        .filter((element) => element instanceof HTMLElement && element.offsetParent !== null)
        .map((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    }));

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
    expect(layout.headingSize).toBeGreaterThanOrEqual(26);
    expect(layout.headingSize).toBeLessThanOrEqual(42);
    expect(layout.inputSizes.every((size) => size >= 16)).toBe(true);

    const mobileNavigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    if (!path.startsWith("/login") && !path.startsWith("/register")) {
      await expect(mobileNavigation).toBeVisible();
      for (const link of await mobileNavigation.getByRole("link").all()) {
        const box = await link.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    }

    await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}.png`), fullPage: true });
  });
}
