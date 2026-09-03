import { expect, test } from "@playwright/test";

test("국가 호버가 회전을 끊거나 마커를 다시 만들지 않는다", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  const globe = page.locator(".landing-globe-live [role='application']");
  await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect(globe).toHaveAttribute("data-auto-rotating", "true");
  await expect(globe.locator(".tg-marker")).toHaveCount(66);
  await expect(globe.locator('[data-code="JP"] .tg-marker__ring')).toHaveText("5");
  await expect(globe.locator('[data-code="US"] .tg-marker__ring')).toHaveText("4");

  const originalMarker = await globe.locator('[data-code="JP"]').elementHandle();
  const canvas = await globe.locator("canvas").boundingBox();
  expect(canvas).not.toBeNull();
  let countryTooltipSeen = false;
  for (const [x, y] of [[0.48, 0.42], [0.46, 0.5], [0.5, 0.48], [0.54, 0.44], [0.49, 0.52]]) {
    await page.mouse.move(canvas!.x + canvas!.width * x, canvas!.y + canvas!.height * y, { steps: 8 });
    await page.waitForTimeout(200);
    countryTooltipSeen ||= await page.locator(".tg-tip em").first().isVisible();
    await expect(globe).toHaveAttribute("data-auto-rotating", "true");
  }
  expect(countryTooltipSeen).toBe(true);
  // Watch rendered marker movement as well as the state flag: a running flag alone
  // would not detect a competing camera tween stopping the actual globe.
  const movement = await globe.evaluate(async (element) => {
    const marker = element.querySelector('[data-code="JP"]')!;
    const first = marker.getBoundingClientRect();
    const started = performance.now();
    let stayedRotating = true;
    let frames = 0;
    await new Promise<void>((resolve) => {
      const sample = () => {
        stayedRotating &&= element.getAttribute("data-auto-rotating") === "true";
        frames++;
        if (performance.now() - started < 1_600) requestAnimationFrame(sample);
        else resolve();
      };
      requestAnimationFrame(sample);
    });
    const last = marker.getBoundingClientRect();
    return { stayedRotating, frames, distance: Math.hypot(last.x - first.x, last.y - first.y) };
  });
  expect(movement.stayedRotating).toBe(true);
  expect(movement.frames).toBeGreaterThan(2);
  expect(movement.distance).toBeGreaterThan(0.5);
  expect(await originalMarker!.evaluate((element) => element.isConnected)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("sample-globe-desktop.png") });
});

test("모바일 크기에서 드래그·확대 후 회전이 재개되고 모션 감소 설정을 따른다", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const globe = page.locator(".landing-globe-live [role='application']");
  await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect(globe).toHaveAttribute("data-auto-rotating", "true");
  const canvas = (await globe.locator("canvas").boundingBox())!;
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.down();
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");
  await page.mouse.move(2, 2, { steps: 12 });
  await page.mouse.up();
  await expect(globe).toHaveAttribute("data-auto-rotating", "true", { timeout: 10_000 });

  await page.getByRole("button", { name: "지구본 확대", exact: true }).click();
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");
  await expect(globe).toHaveAttribute("data-auto-rotating", "true", { timeout: 10_000 });
  await globe.press("ArrowRight");
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(6_500);
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(globe).toHaveAttribute("data-auto-rotating", "true", { timeout: 10_000 });
  await page.screenshot({ path: testInfo.outputPath("sample-globe-mobile.png") });
});

test("샘플 국가를 선택하면 재방문 횟수가 보이고 선택 해제 후 다시 회전한다", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const globe = page.locator(".landing-globe-live [role='application']");
  await expect(globe).toHaveAttribute("aria-busy", "false", { timeout: 30_000 });
  await expect(globe.locator('[data-code="JP"]')).toBeVisible();
  // Stop the moving target using a real control, then exercise the marker click.
  await page.getByRole("button", { name: "지구본 처음 위치로" }).click();
  const japan = globe.locator('[data-code="JP"]');
  await japan.click();
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");
  await expect(page.locator(".landing-landmark-card")).toContainText("여행 5회 · 도시 6곳");
  await expect(page.locator(".landing-landmark-card__action")).toBeVisible();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(6_500);
  await expect(globe).toHaveAttribute("data-auto-rotating", "false");
  await japan.click();
  await expect(page.locator(".landing-landmark-card__action")).toBeHidden();
  await expect(globe).toHaveAttribute("data-auto-rotating", "true", { timeout: 10_000 });
});
