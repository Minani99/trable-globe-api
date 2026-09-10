import { expect, test } from "@playwright/test";

test("여행 화면은 작은 화면과 다크 모드에서도 읽히고 저장 상태를 구분한다", async ({ page }, testInfo) => {
  const username = `launch_${Date.now().toString(36)}`;
  const registration = await page.request.post("/api/auth/register", { data: {
    username, displayName: "출시 점검", email: `${username}@example.com`, password: "launch-review-password-42",
  } });
  expect(registration.status()).toBe(200);
  const country = { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 };
  const creation = await page.request.post("/api/private/travels", { data: {
    title: "교토에서 보내는 주말", startDate: "2027-04-10", endDate: "2027-04-11", description: "", visibility: "PRIVATE", coverImageUrl: null, photos: [],
    places: [
      { country, city: null, placeName: "후시미 이나리 신사와 센본 도리이 산책길", visitedAt: "2027-04-10", startTime: "09:00", durationMinutes: 120, latitude: 34.9671, longitude: 135.7727, memo: "역에서 내려 정문으로 이동" },
      { country, city: null, placeName: "니시키 시장", visitedAt: "2027-04-11", startTime: "12:00", durationMinutes: 60, latitude: 35.005, longitude: 135.764, memo: null },
    ],
  } });
  expect(creation.status()).toBe(201);
  const id = (await creation.json()).data.id;
  await page.route("**/api/weather/forecast?**", async (route) => {
    const firstDay = new URL(route.request().url()).searchParams.get("startDate") === "2027-04-10";
    await route.fulfill({ json: { success: true, data: { available: firstDay, days: firstDay ? [{ date: "2027-04-10", weatherCode: 0, temperatureMax: 33, temperatureMin: 20, precipitationProbability: 0 }] : [] } } });
  });
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "내 여행", exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("studio-desktop.png"), fullPage: true });
  await page.goto(`/studio/travels/${id}/go`);
  await expect(page.locator(".mobile-trip-companion__heading")).toContainText("33°");
  await page.getByRole("button", { name: /DAY 2/ }).click();
  await expect(page.locator(".mobile-trip-companion__heading")).not.toContainText("33°");

  let release!: () => void;
  const hold = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/private/travels/${id}/places/*`, async (route) => { await hold; await route.continue(); });
  const complete = page.getByRole("button", { name: "니시키 시장 완료", exact: true });
  await complete.click();
  await expect(complete).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("button", { name: /DAY 1/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: "메모", exact: true })).toBeDisabled();
  release();
  await expect(page.getByRole("button", { name: "니시키 시장 미완료로 변경" })).toHaveAttribute("aria-busy", "false");
  await page.unroute(`**/api/private/travels/${id}/places/*`);
  for (const note of ["점심은 여기서", "저장 후 다시 수정한 메모"]) {
    await page.getByRole("button", { name: "메모", exact: true }).click();
    await page.getByLabel("한 줄 메모").fill(note);
    await page.getByRole("button", { name: "메모 저장" }).click();
    await expect(page.getByRole("group", { name: "빠른 메모" })).toBeHidden();
    await expect(page.locator(".mobile-trip-companion__timeline")).toContainText(note);
  }
  await page.getByRole("button", { name: /DAY 1/ }).click();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    const action = page.getByRole("button", { name: "메모", exact: true });
    await action.scrollIntoViewIfNeeded();
    const unobstructed = await action.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    });
    expect(unobstructed).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`itinerary-${width}.png`), fullPage: true });
  }
  await page.evaluate(() => document.documentElement.dataset.theme = "dark");
  await page.screenshot({ path: testInfo.outputPath("itinerary-dark.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.dataset.theme = "light");
  await page.getByRole("button", { name: /DAY 2/ }).click();
  await page.getByRole("link", { name: "일정 편집", exact: true }).click();
  await expect(page).toHaveURL(/date=2027-04-11#travel-place-editor/);
  await expect(page.locator(".travel-editor__places")).toContainText("니시키 시장");
});
