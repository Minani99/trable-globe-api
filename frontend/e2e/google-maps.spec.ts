import { expect, test, type Page } from "./fixtures";

test.skip(!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, "브라우저 공개 키가 설정된 빌드에서 실행");

/**
 * A stand-in for the parts of the Maps JavaScript API the app uses. It records what the
 * app asked Google to draw so assertions can check markers, camera moves and gestures.
 */
async function mockGoogleMaps(page: Page, { failImport = false }: { failImport?: boolean } = {}) {
  await page.addInitScript((failImport: boolean) => {
    type Listener = () => void;
    const state = { maps: [] as unknown[], markers: [] as unknown[], requests: 0, lines: [] as Array<{ map: unknown }> };
    const root = window as unknown as Record<string, unknown>;
    root.googleMapsMock = state;
    class LatLng {
      constructor(private latitude: number, private longitude: number) {}
      lat() { return this.latitude; }
      lng() { return this.longitude; }
    }
    class MockMap {
      options: Record<string, unknown>;
      center: { lat: number; lng: number };
      zoom: number;
      pans: Array<{ lat: number; lng: number }> = [];
      fits = 0;
      listeners: Record<string, Listener[]> = {};
      constructor(element: HTMLElement, options: Record<string, unknown>) {
        this.options = options;
        this.center = options.center as { lat: number; lng: number };
        this.zoom = options.zoom as number;
        const canvas = document.createElement("div");
        canvas.className = "mock-google-map";
        canvas.dataset.gestureHandling = String(options.gestureHandling);
        element.append(canvas);
        state.maps.push(this);
      }
      addListener(event: string, listener: Listener) {
        (this.listeners[event] ??= []).push(listener);
        if (event === "idle") queueMicrotask(listener);
        return { remove: () => undefined };
      }
      moveTo(lat: number, lng: number) {
        this.center = { lat, lng };
        this.listeners.idle?.forEach((listener) => listener());
      }
      getCenter() { return new LatLng(this.center.lat, this.center.lng); }
      setCenter(center: { lat: number; lng: number }) { this.center = center; }
      getZoom() { return this.zoom; }
      setZoom(zoom: number) { this.zoom = zoom; }
      panTo(position: { lat: number; lng: number }) { this.pans.push(position); this.center = position; }
      fitBounds() { this.fits += 1; }
    }
    class Marker {
      options: Record<string, unknown>;
      icon: { scale: number };
      listeners: Record<string, Listener> = {};
      constructor(options: Record<string, unknown>) {
        this.options = options;
        this.icon = options.icon as { scale: number };
        state.markers.push(this);
      }
      addListener(event: string, listener: Listener) {
        this.listeners[event] = listener;
        return { remove: () => undefined };
      }
      getPosition() { return this.options.position; }
      setIcon(icon: { scale: number }) { this.icon = icon; }
      setLabel() {}
      setZIndex() {}
      setMap(map: unknown) { this.options.map = map; }
    }
    class LatLngBounds { extend() {} }
    root.google = { maps: {
      LatLngBounds,
      SymbolPath: { CIRCLE: 0 },
      importLibrary: async (name: string) => {
        if (failImport) throw new Error("Provider unavailable");
        if (name === "routes") return { Route: { computeRoutes: async () => {
          state.requests += 1;
          return { routes: [{ path: [{ lat: 35, lng: 135 }], legs: [{ durationMillis: 60000 }, { durationMillis: 120000 }], durationMillis: 180000, distanceMeters: 900, createPolylines: () => {
            const line = { map: null as unknown, setMap(map: unknown) { this.map = map; } };
            state.lines.push(line);
            return [line];
          } }] };
        } } };
        return name === "maps" ? { Map: MockMap } : { Marker };
      },
    } };
  }, failImport);
}

async function seedTodayTrip(page: Page) {
  const username = `gmap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "구글 지도 여행자", email: `${username}@example.com`, password: "google-map-test-only-42" } })).status()).toBe(200);
  const date = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const country = { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 };
  const response = await page.request.post("/api/private/travels", { data: {
    title: "구글 지도로 걷는 교토", description: "", startDate: date, endDate: date, visibility: "PRIVATE", coverImageUrl: null,
    places: ["교토역", "기요미즈데라", "니시키 시장"].map((placeName, index) => ({
      country, city: { nameEn: "Kyoto", nameKo: "교토", latitude: 35.0116, longitude: 135.7681 }, placeName,
      latitude: [34.9858, 34.9949, 35.005][index], longitude: [135.7588, 135.785, 135.7649][index],
      visitedAt: date, startTime: ["09:00", "12:00", "15:00"][index], durationMinutes: 60, memo: null,
    })), photos: [],
  } });
  expect(response.status()).toBe(201);
  await page.route("**/api/weather/forecast?**", (route) => route.fulfill({ json: { success: true, data: { available: false, availableFrom: null, days: [] } } }));
  return (await response.json()).data.id as number;
}

const mock = (page: Page) => page.evaluate(() => {
  const state = (window as unknown as { googleMapsMock: { maps: Array<{ options: { gestureHandling: string }; pans: Array<{ lat: number }> }>; markers: Array<{ options: { title: string }; icon: { scale: number } }> } }).googleMapsMock;
  return {
    gestures: state.maps.map((map) => map.options.gestureHandling),
    pans: state.maps.flatMap((map) => map.pans.map((pan) => pan.lat)),
    markers: state.markers.filter((marker) => (marker.options as { map?: unknown }).map).map((marker) => ({ title: marker.options.title, scale: marker.icon.scale })),
  };
});

test("하루 동선은 Google 지도에 번호 마커로 표시되고 목록·마커 선택이 연결된다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page);
  const id = await seedTodayTrip(page);
  await page.goto(`/studio/travels/${id}/go`);
  const route = page.getByRole("region", { name: "하루 동선 한눈에 보기" });
  await expect(route.locator(".mock-google-map")).toHaveAttribute("data-gesture-handling", "cooperative");
  await expect.poll(async () => (await mock(page)).markers.map((marker) => marker.title)).toEqual([
    "1번째 장소 교토역", "2번째 장소 기요미즈데라", "3번째 장소 니시키 시장",
  ]);
  // Google handles gestures itself, so the old move toggle and +/- buttons are gone.
  await expect(route.getByRole("button", { name: "지도 이동 켜기", exact: true })).toHaveCount(0);
  await expect(route.getByRole("button", { name: "지도 확대" })).toHaveCount(0);
  await expect(route.locator(".travel-route-map-canvas")).toHaveCSS("touch-action", "auto");

  await route.getByRole("button", { name: "2번째 기요미즈데라 지도에서 선택", exact: true }).click();
  await expect.poll(async () => (await mock(page)).pans.at(-1)).toBe(34.9949);
  await expect.poll(async () => (await mock(page)).markers.map((marker) => marker.scale)).toEqual([12, 15, 12]);

  await page.evaluate(() => {
    const state = (window as unknown as { googleMapsMock: { markers: Array<{ listeners: { click: () => void } }> } }).googleMapsMock;
    state.markers[2].listeners.click();
  });
  await expect(route.getByRole("button", { name: "3번째 니시키 시장 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("Google 지도가 열리지 않거나 키가 거부되면 기본 지도로 바뀐다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page, { failImport: true });
  const id = await seedTodayTrip(page);
  await page.goto(`/studio/travels/${id}/go`);
  const route = page.getByRole("region", { name: "하루 동선 한눈에 보기" });
  await expect(route.getByRole("button", { name: "지도 이동 켜기", exact: true })).toBeVisible();
  await expect(route.locator(".travel-route-marker")).toHaveCount(3);
});

test("Google이 키를 거부하면 이미 열린 지도도 기본 지도로 바뀐다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page);
  const id = await seedTodayTrip(page);
  await page.goto(`/studio/travels/${id}/go`);
  const route = page.getByRole("region", { name: "하루 동선 한눈에 보기" });
  await expect(route.locator(".mock-google-map")).toBeAttached();
  // The loader installs Google's auth-failure hook when the map first loads.
  await page.evaluate(() => (window as unknown as { gm_authFailure: () => void }).gm_authFailure());
  await expect(route.locator(".travel-route-marker")).toHaveCount(3);
});

test("위치 조정은 Google 지도를 손가락 하나로 움직이고 가운데 좌표를 확정 위치로 쓴다", async ({ page }) => {
  await mockGoogleMaps(page);
  const username = `gpick_${Date.now().toString(36)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "위치 고르는 여행자", email: `${username}@example.com`, password: "google-picker-test-42" } })).status()).toBe(200);
  await page.goto("/studio/travels/new");
  await page.getByRole("tab", { name: "일정", exact: true }).click();
  await page.getByRole("button", { name: /장소를 추가하세요.*편집/ }).click();
  await page.getByRole("button", { name: /지도에서 직접 찾기/ }).click();
  const dialog = page.getByRole("dialog", { name: "지도에서 위치 조정" });
  await expect(dialog.getByText("Google 지도", { exact: true })).toBeVisible();
  await expect(dialog.locator(".mock-google-map")).toHaveAttribute("data-gesture-handling", "greedy");
  await page.evaluate(() => {
    const state = (window as unknown as { googleMapsMock: { maps: Array<{ moveTo: (lat: number, lng: number) => void }> } }).googleMapsMock;
    state.maps.at(-1)!.moveTo(35.681236, 139.767125);
  });
  await expect(dialog.getByText("35.681236, 139.767125", { exact: true })).toBeVisible();
});


test("공개 여행 지도는 모바일 화면 스크롤을 가로채지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page);
  await page.goto("/traveler/travel/2#route");
  const route = page.getByRole("region", { name: "일정과 동선", exact: true });
  await expect(route.locator(".mock-google-map")).toHaveAttribute("data-gesture-handling", "cooperative");
  await expect(route.locator(".travel-route-map-canvas")).toHaveCSS("touch-action", "auto");
  await expect(route.getByText("한 손가락으로 화면을 스크롤하고, 두 손가락으로 지도를 움직이세요.")).toBeVisible();
});

test("공개 여행의 기본 지도도 스크롤을 허용하고 이동을 켜고 끌 수 있다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page, { failImport: true });
  await page.goto("/traveler/travel/2#route");
  const route = page.getByRole("region", { name: "일정과 동선", exact: true });
  const canvas = route.locator(".travel-route-map-canvas");
  await expect(canvas).toHaveCSS("touch-action", "pan-y pinch-zoom");
  await route.getByRole("button", { name: "지도 이동 켜기", exact: true }).click();
  await expect(canvas).toHaveCSS("touch-action", "none");
  await route.getByRole("button", { name: "지도 이동 끄기", exact: true }).click();
  await expect(canvas).toHaveCSS("touch-action", "pan-y pinch-zoom");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test("공유 일정은 기존 지도에 실제 경로를 표시하고 장소 선택 때 재조회하지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockGoogleMaps(page);
  const id = await seedTodayTrip(page);
  const sharing = await page.request.post(`/api/private/travels/${id}/share`);
  const token = (await sharing.json()).data.token;
  await page.goto(`/share/${token}`);
  await expect(page.locator(".mock-google-map")).toHaveCount(1);
  const state = () => page.evaluate(() => { const s = (window as unknown as { googleMapsMock: { maps: unknown[]; requests: number; lines: Array<{map: unknown}> } }).googleMapsMock; return { maps: s.maps.length, requests: s.requests, lines: s.lines.filter(line => line.map).length }; });
  expect((await state()).requests).toBe(0);
  await page.getByRole("button", { name: "앱에서 경로·이동시간 보기" }).click();
  await expect(page.getByText("이동 약 3분", { exact: true })).toBeVisible();
  await expect.poll(state).toEqual({ maps: 1, requests: 1, lines: 1 });
  await page.locator(".travel-itinerary__list button").nth(1).click();
  await expect(page.locator(".travel-route-map-active strong")).toHaveText("기요미즈데라");
  expect(await state()).toEqual({ maps: 1, requests: 1, lines: 1 });
  await page.getByRole("button", { name: "자동차", exact: true }).click();
  await expect.poll(state).toEqual({ maps: 1, requests: 1, lines: 0 });
  await expect(page.getByText("이동 약 3분", { exact: true })).toHaveCount(0);
});

test("여행 중 지도는 다음 미완료 장소를 따르되 직접 선택한 장소는 유지한다", async ({ page }) => {
  await mockGoogleMaps(page);
  const id = await seedTodayTrip(page);
  await page.goto(`/studio/travels/${id}/go`);
  await page.getByRole("button", { name: "교토역 완료", exact: true }).click();
  await expect(page.getByRole("button", { name: "2번째 기요미즈데라 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await mock(page)).pans.at(-1)).toBe(34.9949);
  const directions = page.getByRole("link", { name: "다음 방문 기요미즈데라 · 길찾기", exact: true });
  const destination = new URL((await directions.getAttribute("href"))!);
  expect(destination.pathname).toBe("/maps/dir/");
  expect(destination.searchParams.get("destination")).toBe("34.9949,135.785");
  await page.getByRole("button", { name: "1번째 교토역 지도에서 선택", exact: true }).click();
  await page.getByRole("button", { name: "기요미즈데라 완료", exact: true }).click();
  await expect(page.getByRole("button", { name: "1번째 교토역 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("link", { name: "다음 방문 니시키 시장 · 길찾기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: /다음 방문 장소로 돌아가기.*니시키 시장/ }).click();
  await expect(page.getByRole("button", { name: "3번째 니시키 시장 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(async () => (await mock(page)).pans.at(-1)).toBe(35.005);
  await expect(page.getByRole("button", { name: /다음 방문 장소로 돌아가기/ })).toHaveCount(0);
  await page.getByRole("button", { name: "교토역 미완료로 변경", exact: true }).click();
  await expect(page.getByRole("button", { name: "1번째 교토역 지도에서 선택", exact: true })).toHaveAttribute("aria-pressed", "true");
});
