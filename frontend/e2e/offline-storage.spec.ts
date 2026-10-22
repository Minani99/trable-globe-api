import { expect, test } from "./fixtures";
test("기기 저장 실패 시 완료로 표시하지 않고 메모 입력을 유지한다", async ({ page }) => {
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
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      if (key.startsWith("travel-globe:trip-queue:")) throw new DOMException("Full", "QuotaExceededError");
      original.call(this, key, value);
    };
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    window.dispatchEvent(new Event("offline"));
  });
  await page.getByRole("button", { name: "첫 장소 완료", exact: true }).click();
  await expect(page.getByText(/기기에 저장하지 못했습니다/)).toBeVisible();
  await expect(page.getByRole("button", { name: "첫 장소 완료", exact: true })).toBeEnabled();
  await page.getByRole("navigation", { name: "여행 중 바로 기록" }).getByRole("button", { name: "메모", exact: true }).click();
  const input = page.getByRole("textbox", { name: "한 줄 메모" });
  await input.fill("저장 실패해도 남아야 하는 메모");
  await page.getByRole("button", { name: "메모 저장", exact: true }).click();
  await expect(input).toHaveValue("저장 실패해도 남아야 하는 메모");
  await expect(page.getByText(/기기에 저장하지 못했습니다/)).toBeVisible();
});