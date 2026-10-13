import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildGoogleDirectionsSegments, type GoogleDirectionsStop } from "../src/lib/google-directions";

function stops(count: number): GoogleDirectionsStop[] {
  return Array.from({ length: count }, (_, index) => ({ key: index, placeName: `장소 ${index + 1}`, latitude: 30 + index, longitude: 135 }));
}

function routeParameters(url: string) {
  const parsed = new URL(url);
  expect(parsed.origin + parsed.pathname).toBe("https://www.google.com/maps/dir/");
  expect(parsed.searchParams.get("api")).toBe("1");
  return Object.fromEntries(parsed.searchParams);
}

test("긴 경로는 모바일 경유지 한도 안에서 모든 장소를 순서대로 연결한다", () => {
  const result = buildGoogleDirectionsSegments(stops(10), "driving");
  expect(result.skipped).toEqual([]);
  expect(result.segments.map((segment) => segment.stops.map((stop) => stop.key))).toEqual([[0, 1, 2, 3, 4], [4, 5, 6, 7, 8], [8, 9]]);
  expect(result.segments.map((segment) => routeParameters(segment.url))).toEqual([
    { api: "1", origin: "30,135", destination: "34,135", travelmode: "driving", waypoints: "31,135|32,135|33,135" },
    { api: "1", origin: "34,135", destination: "38,135", travelmode: "driving", waypoints: "35,135|36,135|37,135" },
    { api: "1", origin: "38,135", destination: "39,135", travelmode: "driving" },
  ]);
});

test("대중교통은 경유지 없이 연속된 두 장소씩 연결한다", () => {
  const result = buildGoogleDirectionsSegments(stops(4), "transit");
  expect(result.segments.map((segment) => routeParameters(segment.url))).toEqual([
    { api: "1", origin: "30,135", destination: "31,135", travelmode: "transit" },
    { api: "1", origin: "31,135", destination: "32,135", travelmode: "transit" },
    { api: "1", origin: "32,135", destination: "33,135", travelmode: "transit" },
  ]);
});

test("위치가 없는 장소와 미정 장소를 건너뛰어 잘못된 경로를 만들지 않는다", () => {
  const input = stops(8);
  input[2].latitude = null;
  input[5].placeName = "1일차 · 장소를 골라주세요";
  const result = buildGoogleDirectionsSegments(input, "walking");
  expect(result.skipped.map((stop) => stop.key)).toEqual([2, 5]);
  expect(result.segments.map((segment) => segment.stops.map((stop) => stop.key))).toEqual([[0, 1], [3, 4], [6, 7]]);
  expect(buildGoogleDirectionsSegments([input[0], input[2], input[3]], "walking").segments).toEqual([]);
});

test("0도 좌표는 유효하며 입력한 방문 순서를 유지한다", () => {
  const input = stops(3);
  input[0] = { ...input[0], latitude: 0, longitude: 0 };
  const result = buildGoogleDirectionsSegments([input[2], input[0], input[1]], "walking");
  expect(result.skipped).toEqual([]);
  expect(routeParameters(result.segments[0].url)).toEqual({ api: "1", origin: "32,135", destination: "31,135", waypoints: "0,0", travelmode: "walking" });
  expect(buildGoogleDirectionsSegments([], "walking").segments).toEqual([]);
  expect(buildGoogleDirectionsSegments([input[0]], "walking").segments).toEqual([]);
});

const routePlaces = [
  { placeName: "교토역", latitude: 34.9858, longitude: 135.7588, visitedAt: "2099-10-10" },
  { placeName: "니시키 시장", latitude: 35.005, longitude: 135.7649, visitedAt: "2099-10-10" },
  { placeName: "가모강", latitude: 35.0116, longitude: 135.7711, visitedAt: "2099-10-10" },
  { placeName: "기요미즈데라", latitude: 34.9949, longitude: 135.785, visitedAt: "2099-10-11" },
  { placeName: "기온", latitude: 35.003, longitude: 135.778, visitedAt: "2099-10-11" },
];

async function seed(page: Page) {
  const username = `directions_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  const registration = await page.request.post("/api/auth/register", { data: { username, displayName: "경로 여행자", email: `${username}@example.com`, password: "directions-test-password-42" } });
  expect(registration.status()).toBe(200);
  const response = await page.request.post("/api/private/travels", { data: {
    title: "교토의 이틀 동선", description: "장소 순서대로 걷는 여행", startDate: "2099-10-10", endDate: "2099-10-11", visibility: "PRIVATE", coverImageUrl: null,
    places: routePlaces.map((place) => ({
      ...place, country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 },
      city: null, startTime: null, durationMinutes: 60, memo: null,
    })), photos: [],
  } });
  expect(response.status()).toBe(201);
  await page.route("**/api/weather/forecast?**", (route) => route.fulfill({ json: { success: true, data: { available: false, availableFrom: null, days: [] } } }));
  return (await response.json()).data.id as number;
}

async function expectRoutes(panel: Locator, expected: Array<Record<string, string>>) {
  const links = panel.getByRole("link");
  await expect(links).toHaveCount(expected.length);
  await expect.poll(async () => Promise.all((await links.all()).map(async (link) => routeParameters((await link.getAttribute("href"))!)))).toEqual(expected);
  for (const link of await links.all()) await expect(link).toHaveAttribute("target", "_blank");
}

test("모바일 일정의 날짜·순서·이동수단이 실제 경로에 반영되고 공유 화면에서도 확인된다", async ({ page, browser }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const id = await seed(page);
  await page.goto(`/studio/travels/${id}/edit?plan=1`);
  await page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true }).click();
  const panel = page.getByRole("region", { name: "실제 이동 경로", exact: true });
  const days = page.getByRole("tablist", { name: "여행 날짜 선택" });
  await expectRoutes(panel, [{ api: "1", origin: "34.9858,135.7588", destination: "35.0116,135.7711", waypoints: "35.005,135.7649", travelmode: "walking" }]);
  await page.getByRole("button", { name: "교토역 순서 이동", exact: true }).press("ArrowDown");
  await expectRoutes(panel, [{ api: "1", origin: "35.005,135.7649", destination: "35.0116,135.7711", waypoints: "34.9858,135.7588", travelmode: "walking" }]);
  await panel.getByRole("button", { name: "자동차", exact: true }).click();
  await days.getByRole("tab", { name: /DAY 2/ }).click();
  await expectRoutes(panel, [{ api: "1", origin: "34.9949,135.785", destination: "35.003,135.778", travelmode: "driving" }]);
  await days.getByRole("tab", { name: /DAY 1/ }).click();
  await panel.getByRole("button", { name: "대중교통", exact: true }).click();
  await expectRoutes(panel, [
    { api: "1", origin: "35.005,135.7649", destination: "34.9858,135.7588", travelmode: "transit" },
    { api: "1", origin: "34.9858,135.7588", destination: "35.0116,135.7711", travelmode: "transit" },
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  const sharing = await page.request.post(`/api/private/travels/${id}/share`);
  expect(sharing.ok()).toBe(true);
  const token = (await sharing.json()).data.token as string;
  expect(token).toBeTruthy();

  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const visitor = await visitorContext.newPage();
    await visitor.goto(new URL(`/share/${token}`, page.url()).toString());
    await expect(visitor.getByRole("heading", { name: "교토의 이틀 동선", exact: true })).toBeVisible();
    const sharedPanel = visitor.getByRole("region", { name: "실제 이동 경로", exact: true });
    await expectRoutes(sharedPanel, [{ api: "1", origin: "35.005,135.7649", destination: "35.0116,135.7711", waypoints: "34.9858,135.7588", travelmode: "walking" }]);
    await expect(visitor.locator(".travel-route-map-canvas svg polyline")).toHaveCount(0);
    await expect(visitor.locator(".travel-route-marker")).toHaveCount(5);
    await sharedPanel.getByRole("group", { name: "경로 날짜 선택" }).getByRole("button", { name: "10.11", exact: true }).click();
    await expectRoutes(sharedPanel, [{ api: "1", origin: "34.9949,135.785", destination: "35.003,135.778", travelmode: "walking" }]);
    expect(await visitor.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await sharedPanel.scrollIntoViewIfNeeded();
    await visitor.screenshot({ path: testInfo.outputPath("google-directions-mobile.png") });
  } finally {
    await visitorContext.close();
  }
});
