import { expect, test } from "@playwright/test";

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
  await page.getByRole("button", { name: /이 일정으로 계획 만들기/ }).click();
  await expect(page.getByText("내 날짜로 일정 가져오기")).toBeVisible();
  const newStartDate = "2026-10-10";
  await page.getByLabel("새 출발일").fill(newStartDate);
  await page.getByRole("button", { name: "2일 일정 담기" }).click();

  await expect(page).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1&source=/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "도쿄 주말 산책에서 시작한 여행" })).toBeVisible();
  await page.getByRole("button", { name: /도쿄역.*편집/ }).click();
  await expect(page.getByRole("textbox", { name: "장소 이름" }).first()).toHaveValue("도쿄역");
  await expect(page.getByRole("textbox", { name: "메모" }).first()).toHaveValue("");
});
