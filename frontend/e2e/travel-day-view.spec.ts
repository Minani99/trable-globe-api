import { expect, test } from "./fixtures";

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
  for (const reservation of [
    { title: "도쿄행 항공편", category: "FLIGHT", reservationDate: firstDay, memo: "출발 2시간 전 체크인", confirmed: true },
    { title: "시부야 호텔", category: "STAY", reservationDate: secondDay, memo: "체크인 15:00\n예약번호 HOTEL-123", confirmed: false },
  ]) {
    expect((await page.request.post(`/api/private/travels/${travelId}/planning/reservations`, { data: reservation })).ok()).toBe(true);
  }
  let reservationRequests = 0;
  let failReservations = true;
  await page.route(`**/api/private/travels/${travelId}/planning`, async route => {
    reservationRequests += 1;
    if (failReservations) return route.fulfill({ status: 503, json: { success: false, data: null, message: "잠시 후 다시 시도해 주세요." } });
    return route.continue();
  });

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
  const reservations = page.getByRole("region", { name: "선택한 날짜 예약" });
  await expect(reservations).toContainText("예약 정보를 불러오지 못했어요");
  await expect(reservations).not.toContainText("등록한 예약이 없어요");
  failReservations = false;
  await reservations.getByRole("button", { name: "예약 다시 확인" }).click();
  await expect(reservations).toContainText("도쿄행 항공편");
  await expect(reservations).toContainText("예약 확정");
  await expect(reservations).not.toContainText("시부야 호텔");
  const requestsAfterLoad = reservationRequests;
  await expect(reservations.getByRole("link", { name: "예약 관리" })).toHaveAttribute("href", `/studio/travels/${travelId}/edit?plan=1#travel-budget`);
  const itineraryCopy = page.locator(".day-itinerary-copy");
  await itineraryCopy.locator("summary").click();
  const expectedFirstDay = `도쿄 2일 여행\n${firstDay} 하루 일정\n\n1. 도쿄역 · 10:00 · 90분`;
  await expect(itineraryCopy.getByRole("textbox", { name: "보낼 내용" })).toHaveValue(expectedFirstDay);
  await itineraryCopy.getByRole("button", { name: "일정 내용 복사" }).click();
  await expect(itineraryCopy.getByRole("status")).toContainText("하루 일정을 복사했어요");
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(expectedFirstDay);
  const tripActions = page.getByRole("navigation", { name: "여행 중 바로 기록" });
  await expect(tripActions.getByRole("link", { name: "일정 편집" })).toBeVisible();
  await expect(tripActions.getByRole("link", { name: "계획 편집" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "여행용 보기 메뉴" }).getByRole("link", { name: "계획 편집" })).toBeVisible();

  await page.getByRole("button", { name: /DAY 2/ }).click();
  await expect(page.getByRole("heading", { name: "2일차 일정" })).toBeVisible();
  await expect(page.getByRole("list", { name: "도쿄 2일 여행 2일차 일정" })).toContainText("시부야 스카이");
  await expect(page).toHaveURL(new RegExp(`date=${secondDay}`));
  await expect(reservations).toContainText("시부야 호텔");
  await expect(reservations).toContainText("예약번호 HOTEL-123");
  await expect(reservations).toContainText("확인 필요");
  await expect(reservations).not.toContainText("도쿄행 항공편");
  expect(reservationRequests).toBe(requestsAfterLoad);
  await itineraryCopy.locator("summary").click();
  await expect(itineraryCopy.getByRole("status")).toBeEmpty();
  const preview = itineraryCopy.getByRole("textbox", { name: "보낼 내용" });
  await expect(preview).toHaveValue(`도쿄 2일 여행\n${secondDay} 하루 일정\n\n1. 시부야 스카이 · 18:00 · 90분`);
  await page.evaluate(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => { throw new DOMException("Denied", "NotAllowedError"); } } }));
  await itineraryCopy.getByRole("button", { name: "일정 내용 복사" }).click();
  await expect(itineraryCopy.getByRole("status")).toContainText("자동 복사를 사용할 수 없어요");
  await expect(preview).toBeFocused();
  expect(await preview.evaluate(node => { const input = node as HTMLTextAreaElement; return input.selectionEnd - input.selectionStart === input.value.length; })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
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
    memo: "개인 예약번호는 공유하지 않기",
  };
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
