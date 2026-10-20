import { expect, test, type Page } from "@playwright/test";
import { suggestVisitOrder } from "../src/lib/itinerary-order";

test("순서 제안은 양 끝과 모든 장소를 보존하고 입력을 변경하지 않는다", () => {
  const stops = [0, 3, 1, 4].map((longitude) => ({ key: String(longitude), latitude: 0, longitude }));
  const original = structuredClone(stops);
  const result = suggestVisitOrder(stops);
  expect(result.ordered.map((stop) => stop.key)).toEqual(["0", "1", "3", "4"]);
  expect(result.afterKm).toBeLessThan(result.beforeKm);
  expect(stops).toEqual(original);
  expect(suggestVisitOrder(result.ordered).ordered).toEqual(result.ordered);
  expect(suggestVisitOrder([]).afterKm).toBe(0);
  expect(suggestVisitOrder(stops.slice(0, 3)).ordered).toEqual(stops.slice(0, 3));
});

async function seed(page: Page) {
  const username = `order_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "순서 여행자", email: `${username}@example.com`, password: "test-order-password-42" } })).ok()).toBe(true);
  const response = await page.request.post("/api/private/travels", { data: {
    title: "동선 순서 검증", startDate: "2099-10-10", endDate: "2099-10-11", visibility: "PRIVATE", description: "", coverImageUrl: null,
    places: [0, 3, 1, 4, 5].map((n, index) => ({ placeName: `장소 ${n}`, latitude: 35, longitude: 135 + n * 0.01, visitedAt: index === 4 ? "2099-10-11" : "2099-10-10", startTime: "10:00", durationMinutes: 60, memo: `메모 ${n}`, city: null,
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 } })),
    photos: [{ imageUrl: "https://images.example.com/order.jpg", caption: "장소 3 사진", takenAt: "2099-10-10", placeIndex: 1 }],
  } });
  expect(response.status()).toBe(201);
  await page.route("**/api/weather/forecast?**", (route) => route.fulfill({ json: { success: true, data: { available: false, days: [] } } }));
  const id = (await response.json()).data.id as number;
  await page.goto(`/studio/travels/${id}/edit?plan=1`);
  await page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true }).click();
  return id;
}

test("모바일에서 제안을 미리 보고 적용·되돌리기·저장하며 다른 날짜와 메모를 유지한다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const id = await seed(page);
  const section = page.getByRole("region", { name: "방문 순서 정리", exact: true });
  const names = () => page.getByRole("button", { name: /장소 \d 순서 이동/ }).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label")));
  await section.getByRole("button", { name: "순서 제안", exact: true }).click();
  await expect(section.locator("li")).toHaveText(["1. 장소 0", "2. 장소 1", "3. 장소 3", "4. 장소 4"]);
  expect(await names()).toEqual(["장소 0 순서 이동", "장소 3 순서 이동", "장소 1 순서 이동", "장소 4 순서 이동"]);
  await section.getByRole("button", { name: "이 순서 적용", exact: true }).click();
  expect(await names()).toEqual(["장소 0 순서 이동", "장소 1 순서 이동", "장소 3 순서 이동", "장소 4 순서 이동"]);
  await section.getByRole("button", { name: "이전 순서로 되돌리기" }).click();
  expect(await names()).toEqual(["장소 0 순서 이동", "장소 3 순서 이동", "장소 1 순서 이동", "장소 4 순서 이동"]);
  await section.getByRole("button", { name: "순서 제안", exact: true }).click();
  await section.getByRole("button", { name: "이 순서 적용", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  const saved = (await (await page.request.get(`/api/private/travels/${id}`, { maxRetries: 2 })).json()).data;
  expect(saved.places.map((p: { placeName: string }) => p.placeName)).toEqual(["장소 0", "장소 1", "장소 3", "장소 4", "장소 5"]);
  for (const p of saved.places) expect(p.memo).toBe(p.placeName.replace("장소", "메모"));
  expect(saved.photos[0].travelPlaceId).toBe(saved.places[2].id);
});

test("Google 지도는 클릭 후 조회하고 변경된 이동수단으로 구간시간을 표시한다", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, "브라우저 공개 키가 설정된 빌드에서 실행");
  await page.addInitScript(() => {
    const requests: unknown[] = [];
    const root = window as unknown as Record<string, unknown>;
    root.routeRequests = requests;
    class MockMap { fitBounds() {} }
    class Bounds { extend() {} }
    class Marker { setMap() {} }
    root.google = { maps: { LatLngBounds: Bounds, Marker, importLibrary: async (name: string) => name === "maps" ? { Map: MockMap } : name === "marker" ? { Marker } : { Route: { computeRoutes: async (request: { intermediates: unknown[] }) => {
      requests.push(request);
      return { routes: [{ path: [{ lat: 35, lng: 135 }], durationMillis: 900000, distanceMeters: 1500, legs: Array.from({ length: request.intermediates.length + 1 }, () => ({ durationMillis: 300000 })), warnings: ["보행 경로를 확인하세요."], createPolylines: () => [{ setMap() {} }] }] };
    } } } } };
  });
  await seed(page);
  expect(await page.evaluate(() => (window as unknown as { routeRequests: unknown[] }).routeRequests.length)).toBe(0);
  await page.getByRole("button", { name: "앱에서 경로·이동시간 보기" }).click();
  await expect(page.getByText("이동 약 15분", { exact: true })).toBeVisible();
  await expect(page.locator(".google-route-preview li")).toHaveCount(3);
  await page.getByRole("group", { name: "경로 이동수단" }).getByRole("button", { name: "자동차" }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { routeRequests: { travelMode: string }[] }).routeRequests.map((r) => r.travelMode))).toEqual(["WALKING", "DRIVING"]);
  await page.getByRole("group", { name: "경로 이동수단" }).getByRole("button", { name: "대중교통" }).click();
  await expect(page.locator(".google-route-canvas")).toHaveCount(0);
});

test("Google 조회 실패 시 가짜 시간 없이 외부 경로 링크를 유지한다", async ({ page }) => {
  test.skip(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, "브라우저 공개 키가 설정된 빌드에서 실행");
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).google = { maps: { importLibrary: async () => { throw new Error("Provider unavailable"); } } };
  });
  await seed(page);
  await page.getByRole("button", { name: "앱에서 경로·이동시간 보기" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "이 경로를 불러오지 못했어요" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Google Maps에서 경로 보기/ })).toBeVisible();
  await expect(page.getByText(/이동 약/)).toHaveCount(0);
});
