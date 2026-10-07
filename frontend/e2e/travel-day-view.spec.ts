import { expect, test } from "@playwright/test";

test("미래 여행도 여행용 보기에서 날짜별로 확인할 수 있다", async ({ page }, testInfo) => {
  const suffix = Date.now().toString(36);
  const username = `dayview_${suffix}`;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const firstDay = addDays(today, 14);
  const secondDay = addDays(today, 15);

  await page.setViewportSize({ width: 390, height: 844 });
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "일정 확인 사용자",
      email: `${username}@example.com`,
      password: "travel-day-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  const travelResponse = await page.request.post("/api/private/travels", {
    data: {
      title: "도쿄 2일 여행",
      description: "여행 전 날짜별 일정 확인",
      startDate: firstDay,
      endDate: secondDay,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: [
        place("도쿄역", firstDay, "10:00", 35.6812, 139.7671),
        place("시부야 스카이", secondDay, "18:00", 35.6584, 139.7016),
      ],
      photos: [],
    },
  });
  expect(travelResponse.status()).toBe(201);
  const travelId = (await travelResponse.json()).data.id as number;

  await page.route("**/api/weather/forecast?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { available: false, availableFrom: null, days: [] }, message: null }) });
  });

  await page.goto("/studio");
  const previewLink = page.getByRole("link", { name: /날짜별 일정 미리보기/ }).first();
  await expect(previewLink).toBeVisible();
  await previewLink.click();
  await expect(page).toHaveURL(new RegExp(`/studio/travels/${travelId}/go$`));
  await expect(page.getByRole("heading", { name: "도쿄 2일 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "1일차 일정" })).toBeVisible();
  await expect(page.getByRole("list", { name: "도쿄 2일 여행 1일차 일정" })).toContainText("도쿄역");
  const tripActions = page.getByRole("navigation", { name: "여행 중 바로 기록" });
  await expect(tripActions.getByRole("link", { name: "일정 편집" })).toBeVisible();
  await expect(tripActions.getByRole("link", { name: "계획 편집" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "여행용 보기 메뉴" }).getByRole("link", { name: "계획 편집" })).toBeVisible();

  await page.getByRole("button", { name: /DAY 2/ }).click();
  await expect(page.getByRole("heading", { name: "2일차 일정" })).toBeVisible();
  await expect(page.getByRole("list", { name: "도쿄 2일 여행 2일차 일정" })).toContainText("시부야 스카이");
  await expect(page).toHaveURL(new RegExp(`date=${secondDay}`));
  await page.reload();
  await expect(page.getByRole("heading", { name: "2일차 일정" })).toBeVisible();
  await expect(tripActions.getByRole("link", { name: "일정 편집" })).toHaveAttribute("href", `/studio/travels/${travelId}/edit?date=${secondDay}#travel-place-editor`);
  await expect(page.getByRole("progressbar", { name: "완료한 일정" })).toHaveAttribute("value", "0");
  const complete = page.getByRole("button", { name: "시부야 스카이 완료", exact: true });
  const checkSize = await complete.boundingBox();
  expect(checkSize!.width).toBeGreaterThanOrEqual(44);
  expect(checkSize!.height).toBeGreaterThanOrEqual(44);
  await complete.click();
  await expect(page.getByRole("button", { name: "시부야 스카이 미완료로 변경" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("progressbar", { name: "완료한 일정" })).toHaveAttribute("value", "1");
  await page.getByRole("button", { name: "시부야 스카이 미완료로 변경" }).click();
  await expect(complete).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("link", { name: /지도에서 위치 보기/ })).toHaveAttribute("href", /google\.com\/maps\/search/);

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  const actionLabels = await tripActions.locator("strong").evaluateAll((labels) => labels.map((label) => ({
    fontSize: Number.parseFloat(getComputedStyle(label).fontSize),
    whiteSpace: getComputedStyle(label).whiteSpace,
  })));
  expect(actionLabels.every(({ fontSize, whiteSpace }) => fontSize >= 12 && whiteSpace === "nowrap")).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("travel-day-mobile.png"), fullPage: true });
});

function place(placeName: string, visitedAt: string, startTime: string, latitude: number, longitude: number) {
  return {
    country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 },
    city: { nameEn: "Tokyo", nameKo: "도쿄", latitude: 35.6762, longitude: 139.6503 },
    placeName,
    latitude,
    longitude,
    visitedAt,
    startTime,
    durationMinutes: 90,
    memo: null,
  };
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
