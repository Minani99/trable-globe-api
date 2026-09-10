import { expect, test } from "@playwright/test";

test("데스크톱 주요 화면은 흰 배경과 각진 정보 구조를 유지한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await expect(page.locator(".landing-globe-frame")).toBeVisible();
  const homeStyle = await page.locator(".landing-globe-frame").evaluate((element) => ({
    background: getComputedStyle(document.body).backgroundColor,
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(homeStyle.background).toBe("rgb(255, 255, 255)");
  expect(homeStyle.radius).toBeLessThanOrEqual(2);
  expect(homeStyle.shadow).toBe("none");
  expect(homeStyle.documentWidth).toBeLessThanOrEqual(homeStyle.viewportWidth + 1);
  await page.screenshot({ path: testInfo.outputPath("flat-home-desktop.png"), fullPage: true });

  await page.goto("/discover");
  await expect(page.locator(".member-card").first()).toBeVisible();
  const memberStyle = await page.locator(".member-card").first().evaluate((element) => ({
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(memberStyle.radius).toBeLessThanOrEqual(2);
  expect(memberStyle.shadow).toBe("none");
  await page.screenshot({ path: testInfo.outputPath("flat-discover-desktop.png"), fullPage: true });

  await page.goto("/login");
  const authStyle = await page.locator(".auth-card").evaluate((element) => ({
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(authStyle.radius).toBe(0);
  expect(authStyle.shadow).toBe("none");
});
