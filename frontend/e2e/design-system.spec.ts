import { expect, test } from "@playwright/test";

/**
 * Design-system guard: one geometry scale, flat content surfaces, no pills.
 * Radii come from tokens.css (xs 6 · sm 10 · md 14 · lg 20 · xl 28).
 */
const RADIUS_SCALE = [0, 6, 10, 14, 20, 28];

function onScale(value: number) {
  return RADIUS_SCALE.some((step) => Math.abs(step - value) <= 0.6);
}

test("데스크톱 주요 화면은 하나의 라운드 스케일과 평평한 표면을 유지한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  await page.goto("/");
  await expect(page.locator(".landing-globe-frame")).toBeVisible();
  const homeStyle = await page.locator(".landing-globe-frame").evaluate((element) => ({
    bodyBackground: getComputedStyle(document.body).backgroundColor,
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(homeStyle.bodyBackground).toBe("rgb(255, 255, 255)");
  expect(onScale(homeStyle.radius)).toBe(true);
  expect(homeStyle.shadow).toBe("none");
  expect(homeStyle.documentWidth).toBeLessThanOrEqual(homeStyle.viewportWidth + 1);
  await page.screenshot({ path: testInfo.outputPath("system-home-desktop.png"), fullPage: true });

  // No pills anywhere on the page: every rendered radius sits on the scale or is a
  // whitelisted circle (avatars, dots, spinners).
  const offScale = await page.evaluate((scale) => {
    const circles = /avatar|dot|spinner|thumb|pulse|marker|pin/i;
    return Array.from(document.querySelectorAll<HTMLElement>("main *, header *, footer *"))
      .filter((element) => {
        if (element instanceof SVGElement) return false;
        if (circles.test(element.className)) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 8 || rect.height < 8) return false;
        const value = Number.parseFloat(getComputedStyle(element).borderTopLeftRadius);
        if (!Number.isFinite(value) || value === 0) return false;
        if (value >= Math.min(rect.width, rect.height) / 2 - 0.5) return false; // genuine circle
        return !scale.some((step) => Math.abs(step - value) <= 0.6);
      })
      .slice(0, 10)
      .map((element) => `${element.tagName.toLowerCase()}.${element.className} → ${getComputedStyle(element).borderTopLeftRadius}`);
  }, RADIUS_SCALE);
  expect(offScale, offScale.join("\n")).toEqual([]);

  await page.goto("/discover");
  await expect(page.locator(".member-card").first()).toBeVisible();
  const memberStyle = await page.locator(".member-card").first().evaluate((element) => ({
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
  }));
  expect(onScale(memberStyle.radius)).toBe(true);
  expect(memberStyle.shadow).toBe("none");
  await page.screenshot({ path: testInfo.outputPath("system-discover-desktop.png"), fullPage: true });

  await page.goto("/login");
  const authStyle = await page.locator(".auth-card").evaluate((element) => ({
    radius: Number.parseFloat(getComputedStyle(element).borderRadius),
    shadow: getComputedStyle(element).boxShadow,
    fontSize: Number.parseFloat(getComputedStyle(element.querySelector("input") ?? element).fontSize),
  }));
  expect(onScale(authStyle.radius)).toBe(true);
  expect(authStyle.shadow).toBe("none");
  expect(authStyle.fontSize).toBeGreaterThanOrEqual(14);
});
