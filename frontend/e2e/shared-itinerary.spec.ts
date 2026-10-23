import { expect, test } from "./fixtures";

test("다른 여행자의 공개 일정을 새 날짜의 내 계획으로 가져온다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const owner = `source_${suffix}`;
  const traveler = `fork_${suffix}`;
  const pastDate = "2025-05-10";

  await page.request.post("/api/auth/register", { data: {
    username: owner,
    displayName: "일정 공유자",
    email: `${owner}@example.com`,
    password: "shared-plan-password-42",
  } });
  const sourceResponse = await page.request.post("/api/private/travels", { data: {
    title: "도쿄 주말 산책",
    description: "처음 가는 사람을 위한 동선",
    startDate: pastDate,
    endDate: "2025-05-11",
    coverImageUrl: null,
    visibility: "PUBLIC",
    places: [{
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.204824, longitude: 138.252924 },
      city: { nameEn: "Tokyo", nameKo: "도쿄", latitude: 35.6762, longitude: 139.6503 },
      placeName: "도쿄역",
      latitude: 35.681236,
      longitude: 139.767125,
      visitedAt: pastDate,
      memo: "오전 산책",
    }],
    photos: [],
  } });
  expect(sourceResponse.status()).toBe(201);
  const sourceBody = await sourceResponse.json();
  const sourceId = sourceBody.data.id as number;
  await page.request.post("/api/auth/logout");

  const registerResponse = await page.request.post("/api/auth/register", { data: {
    username: traveler,
    displayName: "일정 수집가",
    email: `${traveler}@example.com`,
    password: "shared-plan-password-42",
  } });
  expect(registerResponse.status()).toBe(200);

  await page.goto(`/${owner}/travel/${sourceId}`);
  await page.getByRole("button", { name: /내 계획으로 복사/ }).click();
  await expect(page.getByText("내 여행에 일정 복사")).toBeVisible();
  const newStartDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await page.getByLabel("새 출발일").fill(newStartDate);
  await expect(page.locator(".shared-itinerary-save__period")).toContainText(newStartDate);
  let requests = 0;
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/private/travels", async route => {
    if (route.request().method() !== "POST") return route.continue();
    requests += 1;
    if (requests === 1) return route.fulfill({ status: 503, json: { success: false, message: "잠시 후 다시 시도해 주세요.", data: null } });
    await gate;
    await route.continue();
  });
  const copy = page.getByRole("button", { name: "2일 일정 복사" });
  await copy.click();
  await expect(page.locator(".shared-itinerary-save__panel").getByRole("alert")).toContainText("잠시 후 다시 시도해 주세요.");
  await expect(page.getByLabel("새 출발일")).toHaveValue(newStartDate);
  await expect(copy).toBeEnabled();
  try {
    await copy.click();
    await expect.poll(() => requests).toBe(2);
    await expect(page.getByLabel("새 출발일")).toBeDisabled();
    await expect(page.getByRole("button", { name: /내 계획으로 복사/ })).toBeDisabled();
    await expect(page.getByRole("button", { name: "계획에 담는 중…" })).toBeDisabled();
  } finally { release(); }

  await expect(page).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1&source=/, { timeout: 30_000 });
  expect(requests).toBe(2);
  await expect(page.getByRole("heading", { name: "도쿄 주말 산책" })).toBeVisible();
  await page.getByRole("button", { name: /도쿄역.*편집/ }).click();
  await expect(page.getByRole("textbox", { name: "장소 이름" }).first()).toHaveValue("도쿄역");
  await expect(page.getByRole("textbox", { name: "메모" }).first()).toHaveValue("오전 산책");
});
