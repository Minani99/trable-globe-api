import { expect, test } from "./fixtures";
test("모바일 날씨는 동선 위에서 선택 장소의 예보를 보여준다", async ({ page }) => {
  const username = `sync_${Date.now().toString(36)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "동기화 여행자", email: `${username}@example.com`, password: "offline-sync-password-42" } })).ok()).toBe(true);
  const date = "2099-10-10";
  const response = await page.request.post("/api/private/travels", { data: {
    title: "오프라인 기록 보존", startDate: date, endDate: date, visibility: "PRIVATE", description: "", coverImageUrl: null,
    places: ["첫 장소", "둘째 장소"].map((placeName, index) => ({ placeName, latitude: 35 + index * 0.01, longitude: 135, visitedAt: date, startTime: null, durationMinutes: 60, memo: null, city: null,
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 } })), photos: [],
  } });
  expect(response.status()).toBe(201);
  const travel = (await response.json()).data;
  await page.setViewportSize({ width: 320, height: 740 });
  await page.route("**/api/weather/forecast?**", route => {
    const params = new URL(route.request().url()).searchParams;
    const second = params.get("latitude") === "35.01";
    return route.fulfill({ json: { success: true, data: {
      available: true, availableFrom: null,
      days: [{ date, weatherCode: second ? 61 : 0, temperatureMax: 24, temperatureMin: 15, precipitationProbability: second ? 80 : 0, precipitationSum: 0, source: "forecast" }],
    } } });
  });
  await page.goto(`/studio/travels/${travel.id}/go`);
  const first = page.getByRole("region", { name: "첫 장소 여행 날씨" });
  await expect(first).toContainText("맑음");
  const weatherBox = await first.boundingBox();
  const routeBox = await page.getByRole("region", { name: "하루 동선 한눈에 보기" }).boundingBox();
  expect(weatherBox!.y).toBeLessThan(routeBox!.y);
  await page.getByRole("button", { name: "2번째 둘째 장소 지도에서 선택", exact: true }).click();
  const second = page.getByRole("region", { name: "둘째 장소 여행 날씨" });
  await expect(second).toContainText("강수 80%");
  await expect(second).toContainText("우산을 챙기고");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});