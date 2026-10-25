import { expect, test } from "./fixtures";
test("검색어를 지운 뒤 늦은 응답이 새 결과나 선택한 장소를 덮어쓰지 않는다", async ({ page }) => {
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
  await page.route("**/api/maps/config", route => route.fulfill({ json: { success: true, data: { provider: "fallback", maptilerApiKey: null } } }));
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  let oldRequested = false;
  await page.route("**/api/locations/search?**", async route => {
    const query = new URL(route.request().url()).searchParams.get("q");
    if (query === "이전 검색") { oldRequested = true; await gate; }
    await route.fulfill({ json: { success: true, data: [{ id: query, name: query === "이전 검색" ? "늦은 이전 결과" : "새 장소 결과", city: "도쿄", latitude: 35, longitude: 139 }] } });
  });
  await page.goto(`/studio/travels/${travel.id}/edit`);
  await page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true }).click();
  await page.getByRole("button", { name: /첫 장소.*편집/ }).click();
  const input = page.getByRole("textbox", { name: "방문할 장소 검색" }).first();
  await input.fill("이전 검색");
  await input.press("Enter");
  try {
    await expect.poll(() => oldRequested).toBe(true);
    await input.fill("");
    await expect(page.getByRole("button", { name: "검색", exact: true }).first()).toBeEnabled();
    await expect(page.getByRole("list", { name: "장소 검색 결과" })).toHaveCount(0);
    await input.fill("새 검색");
    await input.press("Enter");
    await expect(page.getByText("새 장소 결과", { exact: true })).toBeVisible();
  } finally { release(); }
  await expect(page.getByText("늦은 이전 결과", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /새 장소 결과/ }).click();
  await expect(input).toHaveValue("새 장소 결과");
  await expect(page.getByRole("list", { name: "장소 검색 결과" })).toHaveCount(0);
});
