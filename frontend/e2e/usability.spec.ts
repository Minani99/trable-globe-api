import { expect, test } from "@playwright/test";

for (const width of [320, 390, 768]) {
  test(`${width}px 설정·여행 준비·하루 동선이 잘리지 않고 순서를 유지한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    const username = `ux_${width}_${Date.now().toString(36)}`;
    expect((await page.request.post("/api/auth/register", { data: { username, displayName: "차분한 여행자", email: `${username}@example.com`, password: "usability-test-only-42" } })).status()).toBe(200);
    const date = new Date(Date.now() + 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
    const country = { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 };
    const response = await page.request.post("/api/private/travels", { data: {
      title: "방문 순서대로 걷는 교토", description: "", startDate: date, endDate: date, visibility: "PRIVATE", coverImageUrl: null,
      places: ["교토역", "기요미즈데라", "니시키 시장"].map((placeName, index) => ({
        country, city: { nameEn: "Kyoto", nameKo: "교토", latitude: 35.0116, longitude: 135.7681 }, placeName,
        latitude: [34.9858, 34.9949, 35.005][index], longitude: [135.7588, 135.785, 135.7649][index],
        visitedAt: date, startTime: ["18:00", "09:00", "12:00"][index], durationMinutes: 60, memo: null,
      })), photos: [],
    } });
    expect(response.status()).toBe(201);
    const id = (await response.json()).data.id;
    let forecasts = 0;
    let mapRequests = 0;
    page.on("request", (request) => { if (request.url().includes("/api/maps/config")) mapRequests += 1; });
    await page.route("**/api/weather/forecast?**", async (route) => {
      forecasts += 1;
      await route.fulfill({ json: { success: true, data: { available: true, availableFrom: null, days: [{ date, weatherCode: 3, temperatureMin: 15, temperatureMax: 23, precipitationProbability: 30, precipitationSum: null, source: "forecast" }] } } });
    });
    const assertFits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "내 정보", exact: true })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "표시 이름" })).toBeVisible();
    await assertFits();
    expect(await page.locator(".account-photo").evaluate((node) => getComputedStyle(node).borderRadius)).not.toBe("50%");
    await page.getByRole("button", { name: "계정 삭제", exact: true }).click();
    await expect(page.getByRole("button", { name: "내 계정 영구 삭제", exact: true })).toBeVisible();
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`settings-${width}.png`), fullPage: true });
    await page.goto(`/studio/travels/${id}/edit#travel-preparation`);
    const tabs = page.getByRole("tablist", { name: "여행 작업", exact: true });
    await expect(tabs.getByRole("tab")).toHaveText(["항공권", "준비물", "예산·예약", "일정", "사진·메모", "여행 정보"]);
    await expect(tabs.getByRole("tab", { name: "항공권", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("23° / 15°", { exact: true })).toBeVisible();
    await assertFits();
    const airport = await page.getByRole("combobox", { name: "도착 공항 검색" }).boundingBox();
    expect(airport!.width).toBeGreaterThan(120);
    expect(mapRequests).toBe(0);
    await page.screenshot({ path: testInfo.outputPath(`flights-${width}.png`), fullPage: true });
    await tabs.getByRole("tab", { name: "일정", exact: true }).click();
    const remove = page.getByRole("button", { name: "여행 삭제", exact: true });
    await expect(remove).toBeVisible();
    const target = await remove.boundingBox();
    expect(target!.height).toBeGreaterThanOrEqual(44);
    expect(await remove.locator("svg").count()).toBe(1);
    // The forecast card and the automatic itinerary check share one public request.
    await expect(page.getByRole("button", { name: "예보 다시 확인", exact: true })).toBeVisible();
    expect(forecasts).toBe(1);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
    expect((await page.request.get(`/api/private/travels/${id}`)).status()).toBe(200);
    const dayResponse = await page.goto(`/studio/travels/${id}/go`);
    expect(dayResponse?.status()).toBe(200);
    const route = page.getByRole("region", { name: "하루 동선 한눈에 보기" });
    await expect(route.locator(".day-route-stops li")).toHaveText(["1교토역", "2기요미즈데라", "3니시키 시장"]);
    await expect(route.locator(".day-route-next")).toContainText("1. 교토역");
    const map = route.locator(".travel-route-map-canvas");
    await expect(map).toHaveCSS("touch-action", "pan-y pinch-zoom");
    await route.getByRole("button", { name: "2번째 기요미즈데라 지도에서 선택", exact: true }).click();
    await expect(map.locator(".travel-route-map-active strong")).toHaveText("기요미즈데라");
    await route.getByRole("button", { name: "전체 장소 위치 맞춤" }).click();
    await map.getByRole("button", { name: "3번째 장소 니시키 시장", exact: true }).click();
    await expect(route.getByRole("button", { name: "3번째 니시키 시장 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
    await route.getByRole("button", { name: "지도 이동 켜기", exact: true }).click();
    await expect(map).toHaveCSS("touch-action", "none");
    await route.getByRole("button", { name: "지도 이동 끄기", exact: true }).click();
    await expect(map).toHaveCSS("touch-action", "pan-y pinch-zoom");
    if (width === 320) {
      await map.evaluate((node) => node.scrollIntoView({ block: "center", behavior: "instant" }));
      const box = (await map.boundingBox())!;
      const scrollBefore = await page.evaluate(() => window.scrollY);
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
      const x = box.x + 30;
      const y = box.y + box.height * 0.5;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let step = 1; step <= 5; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y - step * 18 }] });
        await page.waitForTimeout(30);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(scrollBefore + 20);
    }
    await page.getByRole("navigation", { name: "여행 중 바로 기록" }).getByRole("button", { name: "메모", exact: true }).click();
    const composer = page.getByRole("group", { name: "빠른 메모", exact: true });
    await expect(composer.locator("option:checked")).toHaveText("3번째 · 니시키 시장");
    await composer.getByRole("textbox", { name: "한 줄 메모" }).fill("니시키 시장에 남길 메모");
    await route.getByRole("button", { name: "2번째 기요미즈데라 지도에서 선택", exact: true }).click();
    await expect(composer.locator("option:checked")).toHaveText("3번째 · 니시키 시장");
    await expect(composer.getByRole("textbox", { name: "한 줄 메모" })).toHaveValue("니시키 시장에 남길 메모");
    await composer.getByRole("button", { name: "빠른 기록 닫기" }).click();
    const routeBox = await route.boundingBox();
    const weatherBox = await page.locator(".trip-forecast").boundingBox();
    expect(weatherBox!.y).toBeLessThan(routeBox!.y);
    const directions = route.getByRole("link", { name: /Google Maps에서 경로 보기/ });
    const url = new URL((await directions.getAttribute("href"))!);
    expect(url.searchParams.get("origin")).toBe("34.9858,135.7588");
    expect(url.searchParams.get("waypoints")).toBe("34.9949,135.785");
    expect(url.searchParams.get("destination")).toBe("35.005,135.7649");
    await expect(page.locator(".mobile-trip-companion__timeline li strong")).toHaveText(["교토역", "기요미즈데라", "니시키 시장"]);
    const before = forecasts;
    await page.getByRole("button", { name: "교토역 완료", exact: true }).click();
    await expect(page.getByRole("button", { name: "교토역 미완료로 변경", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(route.locator(".day-route-next")).toContainText("2. 기요미즈데라");
    expect(forecasts).toBe(before);
    await assertFits();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`day-route-${width}.png`), fullPage: true });
  });
}

test("날씨는 누락된 좌표와 실제로 없는 날짜를 거절한다", async ({ request }) => {
  for (const query of ["startDate=2026-10-20&endDate=2026-10-21", "latitude=35&longitude=135&startDate=2027-02-30&endDate=2027-03-01"]) {
    expect((await request.get(`/api/weather/forecast?${query}`)).status()).toBe(400);
  }
});
