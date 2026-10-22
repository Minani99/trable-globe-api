import { expect, test } from "./fixtures";

test("부분 동기화 실패와 새로고침 후에도 미전송 완료·메모를 보존한다", async ({ page }) => {
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
  await page.route("**/api/weather/forecast?**", (route) => route.fulfill({ json: { success: true, data: { available: false, days: [] } } }));
  await page.goto(`/studio/travels/${travel.id}/go`);
  const key = `travel-globe:trip-queue:v1:${username}:${travel.id}`;
  await page.evaluate(({ key, ids }: { key: string; ids: number[] }) => localStorage.setItem(key, JSON.stringify(ids.map((placeId, index) => ({ id: `queued-${index}`, placeId, memo: `오프라인 메모 ${index + 1}`, completed: true, createdAt: "2026-10-22T00:00:00.000Z" })))), { key, ids: travel.places.map((p: { id: number }) => p.id) });
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let firstRequested = false;
  const pattern = `**/api/private/travels/${travel.id}/places/*`;
  await page.route(pattern, async (route) => {
    if (route.request().url().endsWith(`/${travel.places[0].id}`)) {
      firstRequested = true;
      await gate;
      await route.continue();
    } else {
      await route.fulfill({ status: 503, json: { success: false, message: "동기화 테스트 연결 오류", data: null } });
    }
  });
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect.poll(() => firstRequested).toBe(true);
    await expect(page.getByRole("button", { name: "둘째 장소 미완료로 변경", exact: true })).toBeDisabled();
    await expect(page.getByRole("progressbar", { name: "완료한 일정" })).toHaveAttribute("value", "2");
  } finally { release(); }
  await expect(page.getByText("동기화 테스트 연결 오류", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "둘째 장소 미완료로 변경", exact: true })).toBeEnabled();
  await expect(page.locator(".mobile-trip-companion__timeline")).toContainText("오프라인 메모 2");
  await expect(page.getByRole("progressbar", { name: "완료한 일정" })).toHaveAttribute("value", "2");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, key)).toBe(1);
  const cacheKey = `travel-globe:trip-cache:v1:${username}:${travel.id}`;
  await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).travel.places[1].memo, cacheKey)).toBe("오프라인 메모 2");
  await page.reload();
  await expect(page.getByText("동기화 테스트 연결 오류", { exact: true })).toBeVisible();
  await expect(page.getByRole("progressbar", { name: "완료한 일정" })).toHaveAttribute("value", "2");
  await expect(page.locator(".mobile-trip-companion__timeline")).toContainText("오프라인 메모 2");
  await page.unroute(pattern);
  await page.getByRole("button", { name: "다시 동기화", exact: true }).click();
  await expect(page.getByText("오프라인 기록을 모두 동기화했습니다.", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
  const saved = (await (await page.request.get(`/api/private/travels/${travel.id}`, { maxRetries: 2 })).json()).data;
  expect(saved.places.map((p: { memo: string }) => p.memo)).toEqual(["오프라인 메모 1", "오프라인 메모 2"]);
  expect(saved.places.every((p: { completedAt: string | null }) => p.completedAt !== null)).toBe(true);
});
