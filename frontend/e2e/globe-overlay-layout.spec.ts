import { expect, test } from "@playwright/test";

test("지구본 정보와 계정 메뉴는 방문 횟수 레이어 위에 표시된다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(page.locator(".landing-world-summary__stats")).toContainText("국가66");
  const scene = page.locator(".tg-globe__scene");
  await expect(scene).toHaveAttribute("aria-busy", "false");
  expect(await scene.evaluate((element) => getComputedStyle(element).isolation)).toBe("isolate");
  const summary = page.locator(".landing-world-summary");
  const box = await summary.boundingBox();
  const sceneBox = await scene.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(sceneBox!.y + 1);
  await page.screenshot({ path: testInfo.outputPath("globe-summary-desktop.png"), fullPage: false });
});

test("긴 여행 제목과 빠른 기록은 작은 화면에서 넘치지 않고 지구본 위에 열린다", async ({ page }, testInfo) => {
  const username = `overlay_${Date.now().toString(36)}`;
  const title = "서울에서친구들과함께보내는아주긴여행제목과카페방문계획";
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "프로필 이름도 아주 길게 표시하는 여행자", email: `${username}@example.com`, password: "overlay-password-42" } })).status()).toBe(200);
  expect((await page.request.post("/api/private/travels", { data: {
    title, startDate: today, endDate: today, description: "", visibility: "PUBLIC", coverImageUrl: null, photos: [],
    places: [{ country: { iso2Code: "KR", iso3Code: "KOR", nameEn: "South Korea", nameKo: "대한민국", latitude: 35.9077, longitude: 127.7669 }, city: null, placeName: "아주긴이름의카페에서친구들과함께먹는브런치", latitude: 37.5444, longitude: 127.0374, visitedAt: today, startTime: "10:00", durationMinutes: 90, memo: "여행 중 메모" }],
  } })).status()).toBe(201);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "빠른 기록" });
  await expect(trigger).toBeVisible();
  const fits = await trigger.evaluate((button) => [...button.querySelectorAll("span")].every((item) => {
    const bounds = item.getBoundingClientRect();
    const parent = button.getBoundingClientRect();
    return bounds.left >= parent.left && bounds.right <= parent.right && item.scrollWidth <= item.clientWidth + 1;
  }));
  expect(fits).toBe(true);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: `${title} 빠른 기록` });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.matches(":modal"))).toBe(true);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 740 });
    expect(await dialog.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
    const titleFits = await dialog.locator(":scope > header strong").evaluate((element) => element.scrollWidth <= element.clientWidth + 1);
    expect(titleFits).toBe(true);
    const close = dialog.locator(":scope > header button");
    expect(await close.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`quick-capture-${width}.png`) });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.getByRole("button", { name: "계정 메뉴 열기" }).click();
  const menu = page.locator(".site-account-popover");
  await expect(menu).toBeVisible();
  expect(await menu.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
  })).toBe(true);
});
