import { expect, test } from "@playwright/test";

test("끝난 계획을 모바일 마무리 화면에서 대표 장면과 기록으로 공개한다", async ({ page }, testInfo) => {
  const suffix = Date.now().toString(36);
  const username = `finish_${suffix}`;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const startDate = addDays(today, -3);
  const endDate = addDays(today, -1);

  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "여행 마무리 테스트",
      email: `${username}@example.com`,
      password: "finish-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  const createResponse = await page.request.post("/api/private/travels", {
    data: {
      title: "도쿄 주말 계획",
      description: null,
      startDate,
      endDate,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: [{
        country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.204824, longitude: 138.252924 },
        city: { nameEn: "Tokyo", nameKo: "도쿄", latitude: 35.6762, longitude: 139.6503 },
        placeName: "도쿄역",
        latitude: 35.681236,
        longitude: 139.767125,
        visitedAt: startDate,
        startTime: "10:00",
        durationMinutes: 90,
        memo: "첫날 산책",
        completed: true,
      }],
      photos: [
        { imageUrl: "/placeholders/photo-01.svg", caption: null, takenAt: startDate, placeIndex: 0 },
        { imageUrl: "/placeholders/photo-02.svg", caption: "도쿄의 밤", takenAt: endDate, placeIndex: null },
      ],
    },
  });
  expect(createResponse.status()).toBe(201);
  const travelId = ((await createResponse.json()).data as { id: number }).id;

  await page.setViewportSize({ width: 1365, height: 900 });
  await page.goto("/studio");
  const finishLink = page.getByRole("link", { name: /기록 완성하기/ });
  await expect(finishLink).toHaveAttribute("href", `/studio/travels/${travelId}/edit?finish=1`);
  await finishLink.click();

  await expect(page).toHaveURL(new RegExp(`/studio/travels/${travelId}/edit\\?finish=1$`));
  await expect(page.getByRole("heading", { name: "여행 마무리" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "여행 준비" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "전체 편집" })).toBeVisible();
  await expect(page.getByText("2/4", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("travel-finish-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole("heading", { name: "여행 마무리" })).toBeVisible();

  await page.getByLabel("여행 제목").fill("다녀온 도쿄 주말");
  await page.getByRole("textbox", { name: "여행 기록", exact: true }).fill("계획보다 천천히 걸어서 더 좋았던 주말");
  await page.locator(".travel-finish__scene-grid button").nth(1).click();
  await page.getByLabel("사진 1 설명").fill("도쿄역에 도착한 오전");
  await expect(page.getByText("4/4", { exact: true })).toBeVisible();

  const layout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  await page.screenshot({ path: testInfo.outputPath("travel-finish-mobile.png"), fullPage: true });

  await page.getByRole("button", { name: "기록 공개" }).click();
  await expect(page).toHaveURL(new RegExp(`/${username}/travel/${travelId}$`), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "다녀온 도쿄 주말" })).toBeVisible();
  await expect(page.getByText("계획보다 천천히 걸어서 더 좋았던 주말", { exact: true })).toBeVisible();
});

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
