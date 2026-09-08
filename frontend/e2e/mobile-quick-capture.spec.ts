import { expect, test } from "@playwright/test";

test("진행 중인 여행은 모바일 어디서나 장소·사진·메모로 바로 이어진다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `capture_${suffix}`;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const tomorrow = addDays(today, 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "여행 중인 사람",
      email: `${username}@example.com`,
      password: "capture-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  const travelResponse = await page.request.post("/api/private/travels", {
    data: {
      title: "오늘의 서울 산책",
      description: "여행 중 빠른 기록을 확인하는 일정",
      startDate: today,
      endDate: tomorrow,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: [{
        country: { iso2Code: "KR", iso3Code: "KOR", nameEn: "South Korea", nameKo: "대한민국", latitude: 35.907757, longitude: 127.766922 },
        city: { nameEn: "Seoul", nameKo: "서울", latitude: 37.5665, longitude: 126.978 },
        placeName: "서울숲",
        latitude: 37.5444,
        longitude: 127.0374,
        visitedAt: today,
        startTime: "10:00",
        durationMinutes: 90,
        memo: "나무 그늘에서 잠시 쉬기",
      }],
      photos: [],
    },
  });
  expect(travelResponse.status()).toBe(201);
  const createdTravel = (await travelResponse.json()).data;
  const travelId = createdTravel.id as number;

  await page.route("**/api/weather/forecast?**", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { available: false, availableFrom: null, days: [] }, message: null }) });
  });
  let uploadedBytes = 0;
  let uploadedContentType = "";
  await page.route("**/api/uploads/presign", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { configured: true, maxBytes: 10 * 1024 * 1024, maxPhotos: 30, acceptedTypes: ["image/jpeg", "image/png", "image/webp"] }, message: null }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: { objectKey: "members/test/photos/optimized.webp", uploadUrl: "https://upload.travel-globe.test/optimized.webp", publicUrl: "https://images.travel-globe.test/optimized.webp", expiresInSeconds: 300 }, message: null }) });
  });
  await page.route("https://upload.travel-globe.test/**", async (route) => {
    uploadedBytes = route.request().postDataBuffer()?.length ?? 0;
    uploadedContentType = route.request().headers()["content-type"] ?? "";
    await route.fulfill({ status: 200, body: "" });
  });
  await page.goto("/discover");

  const trigger = page.getByRole("button", { name: "빠른 기록" });
  await expect(trigger).toBeVisible();
  await trigger.click();

  const capture = page.getByRole("region", { name: "오늘의 서울 산책 빠른 기록" });
  await expect(capture).toBeVisible();
  await expect(capture).toContainText("오늘 진행 중인 여행을 자동으로 선택했어요.");
  await expect(capture.getByRole("heading", { name: "오늘 일정" })).toBeVisible();
  await expect(capture.getByRole("list", { name: "오늘의 서울 산책 오늘 일정" })).toContainText("서울숲");
  await expect(capture.getByRole("link", { name: /지도에서 위치 보기/ })).toHaveAttribute("href", /google\.com\/maps\/search/);
  await expect(capture.getByRole("link", { name: /장소/ })).toHaveAttribute("href", `/studio/travels/${travelId}/edit#travel-place-editor`);
  await capture.getByRole("button", { name: "메모" }).click();
  const quickNote = capture.getByRole("group", { name: "빠른 메모" });
  await expect(quickNote.getByRole("textbox", { name: "한 줄 메모" })).toHaveValue("나무 그늘에서 잠시 쉬기");
  await quickNote.getByRole("textbox", { name: "한 줄 메모" }).fill("서울숲에서 바로 남긴 현장 메모");
  await quickNote.getByRole("button", { name: "메모 저장" }).click();
  await expect(capture.getByRole("status")).toContainText("메모를 남겼어요");
  await expect(capture.getByRole("list", { name: "오늘의 서울 산책 오늘 일정" })).toContainText("서울숲에서 바로 남긴 현장 메모");
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).some((key) => key.startsWith("travel-globe:trip-cache:v1:")))).toBe(true);

  await page.route("**/api/private/travels", async (route) => route.abort("internetdisconnected"));
  await page.reload();
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(capture).toContainText("기기에 저장된 일정을 표시하고 있어요.");
  await expect(capture.getByRole("list", { name: "오늘의 서울 산책 오늘 일정" })).toContainText("서울숲에서 바로 남긴 현장 메모");
  await page.unroute("**/api/private/travels");

  await capture.getByRole("button", { name: "사진" }).click();
  const quickPhoto = capture.getByRole("group", { name: "빠른 사진 기록" });
  await expect(quickPhoto.locator('input[type="file"]')).toHaveAttribute("capture", "environment");
  const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const largePhoto = Buffer.concat([tinyPng, Buffer.alloc(3 * 1024 * 1024)]);
  await quickPhoto.locator('input[type="file"]').setInputFiles({ name: "large-photo.png", mimeType: "image/png", buffer: largePhoto });
  await expect(capture.getByText(/사진을 기록했어요\. 3\.0MB →/)).toBeVisible();
  expect(uploadedContentType).toBe("image/webp");
  expect(uploadedBytes).toBeGreaterThan(0);
  expect(uploadedBytes).toBeLessThan(largePhoto.length);

  await page.context().setOffline(true);
  await expect(capture.getByText("오프라인 모드")).toBeVisible();
  await capture.getByRole("button", { name: "서울숲 완료" }).click();
  await expect(capture.getByText("오늘 일정을 모두 마쳤어요.")).toBeVisible();
  await expect(capture.getByText(/완료 상태를 기기에 저장했습니다/)).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("travel-globe:trip-queue:v1:"))
    .map((key) => JSON.parse(localStorage.getItem(key) ?? "[]").length)
    .reduce((sum, count) => sum + count, 0))).toBe(1);

  await page.context().setOffline(false);
  await expect(capture.getByText("오프라인 기록을 모두 동기화했습니다.")).toBeVisible();
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage)
    .filter((key) => key.startsWith("travel-globe:trip-queue:v1:"))
    .map((key) => JSON.parse(localStorage.getItem(key) ?? "[]").length)
    .reduce((sum, count) => sum + count, 0))).toBe(0);
  const savedTravel = await page.request.get(`/api/private/travels/${travelId}`);
  expect(savedTravel.status()).toBe(200);
  expect((await savedTravel.json()).data.places[0].completedAt).not.toBeNull();

  await capture.getByRole("link", { name: /장소/ }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/travels/${travelId}/edit#travel-place-editor$`));
  await expect(page.locator("#travel-place-editor")).toBeVisible();
  await expect(page.locator("#travel-day-view").getByRole("heading", { name: "오늘 일정" })).toBeVisible();

  const quickNavigation = page.getByRole("navigation", { name: "여행 중 빠른 입력" });
  await expect(quickNavigation).toBeVisible();
  await expect(page.getByRole("tab", { name: /DAY 1/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#travel-photo-editor input[type=file]")).toHaveAttribute("multiple", "");

  await quickNavigation.getByRole("button", { name: "메모" }).click();
  await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe("travel-note-editor");

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
});

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
