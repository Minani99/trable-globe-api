import { expect, test } from "@playwright/test";

test("진행 중인 여행은 모바일 어디서나 장소·사진·메모로 바로 이어진다", async ({ page }, testInfo) => {
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

  const capture = page.getByRole("dialog", { name: "오늘의 서울 산책 빠른 기록" });
  await expect(capture).toBeVisible();
  await expect(capture).toContainText("여행 중 · 대한민국");
  await expect(capture.getByRole("heading", { name: "오늘 일정" })).toBeVisible();
  await expect(capture.getByRole("list", { name: "오늘의 서울 산책 오늘 일정" })).toContainText("서울숲");
  await expect(capture.getByRole("link", { name: /지도에서 위치 보기/ })).toHaveAttribute("href", /google\.com\/maps\/search/);
  await expect(capture.getByRole("link", { name: "일정 편집" })).toHaveAttribute("href", `/studio/travels/${travelId}/edit?date=${today}#travel-place-editor`);
  await expect(capture.getByRole("link", { name: "다른 날짜 일정 보기" })).toHaveAttribute("href", `/studio/travels/${travelId}/go`);
  const tripActions = capture.getByRole("navigation", { name: "여행 중 바로 기록" });
  const noteAction = tripActions.getByRole("button", { name: "메모" });
  await expect(noteAction).toHaveAttribute("aria-pressed", "false");
  await noteAction.click();
  await expect(noteAction).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: testInfo.outputPath("quick-note-selected.png"), fullPage: true });
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
  await expect(capture).toContainText("기기에 저장된 일정");
  await expect(capture.getByRole("list", { name: "오늘의 서울 산책 오늘 일정" })).toContainText("서울숲에서 바로 남긴 현장 메모");
  await page.unroute("**/api/private/travels");

  const photoAction = tripActions.getByRole("button", { name: "사진" });
  await photoAction.click();
  await expect(photoAction).toHaveAttribute("aria-pressed", "true");
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

  await capture.getByRole("link", { name: "일정 편집" }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/travels/${travelId}/edit\\?date=${today}#travel-place-editor$`));
  await expect(page.locator("#travel-place-editor")).toBeVisible();
  const workspaceTabs = page.getByRole("tablist", { name: "여행 작업", exact: true });
  await expect(page.getByRole("tab", { name: /DAY 1/ })).toHaveAttribute("aria-selected", "true");
  await workspaceTabs.getByRole("tab", { name: "사진·메모", exact: true }).click();
  const photoEditor = page.locator("#travel-photo-editor");
  await expect(photoEditor.getByText("사진을 선택하거나 이곳에 놓아 주세요", { exact: true })).toBeVisible();
  await photoEditor.locator('input[type="file"]').setInputFiles({
    name: "seoul-forest.jpg",
    mimeType: "image/jpeg",
    buffer: jpegWithExif(today, 37.5444, 127.0374),
  });
  await expect(photoEditor.getByRole("status")).toContainText("촬영정보로 날짜 1장 · 장소 1장");
  const importedPhoto = photoEditor.locator(".travel-editor__photos > li").last();
  await expect(importedPhoto.getByLabel("촬영일")).toHaveValue(today);
  await expect(importedPhoto.getByLabel("연결할 장소")).toHaveValue("0");

  await workspaceTabs.getByRole("tab", { name: "일정", exact: true }).click();
  await page.locator(".editor-stop__summary").first().click();
  await page.locator("#travel-note-editor").focus();
  await expect(page.locator("#travel-note-editor")).toBeFocused();

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

function jpegWithExif(date: string, latitude: number, longitude: number): Buffer {
  const [year, month, day] = date.split("-");
  const dateTime = `${year}:${month}:${day} 12:00:00\0`;
  const tiff = Buffer.alloc(178);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);

  tiff.writeUInt16LE(2, 8);
  writeIfdEntry(tiff, 10, 0x8769, 4, 1, 38);
  writeIfdEntry(tiff, 22, 0x8825, 4, 1, 76);
  tiff.writeUInt32LE(0, 34);

  tiff.writeUInt16LE(1, 38);
  writeIfdEntry(tiff, 40, 0x9003, 2, 20, 56);
  tiff.writeUInt32LE(0, 52);
  tiff.write(dateTime, 56, "ascii");

  tiff.writeUInt16LE(4, 76);
  writeIfdEntry(tiff, 78, 0x0001, 2, 2, latitude < 0 ? 0x00000053 : 0x0000004e);
  writeIfdEntry(tiff, 90, 0x0002, 5, 3, 130);
  writeIfdEntry(tiff, 102, 0x0003, 2, 2, longitude < 0 ? 0x00000057 : 0x00000045);
  writeIfdEntry(tiff, 114, 0x0004, 5, 3, 154);
  tiff.writeUInt32LE(0, 126);
  writeGpsRationals(tiff, 130, Math.abs(latitude));
  writeGpsRationals(tiff, 154, Math.abs(longitude));

  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const segment = Buffer.alloc(4);
  segment[0] = 0xff;
  segment[1] = 0xe1;
  segment.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), segment, payload, Buffer.from([0xff, 0xd9])]);
}

function writeIfdEntry(buffer: Buffer, offset: number, tag: number, type: number, count: number, value: number) {
  buffer.writeUInt16LE(tag, offset);
  buffer.writeUInt16LE(type, offset + 2);
  buffer.writeUInt32LE(count, offset + 4);
  buffer.writeUInt32LE(value, offset + 8);
}

function writeGpsRationals(buffer: Buffer, offset: number, coordinate: number) {
  const degrees = Math.floor(coordinate);
  const minuteValue = (coordinate - degrees) * 60;
  const minutes = Math.floor(minuteValue);
  const secondsTimesTenThousand = Math.round((minuteValue - minutes) * 60 * 10_000);
  for (const [index, numerator, denominator] of [
    [0, degrees, 1],
    [1, minutes, 1],
    [2, secondsTimesTenThousand, 10_000],
  ] as const) {
    buffer.writeUInt32LE(numerator, offset + index * 8);
    buffer.writeUInt32LE(denominator, offset + index * 8 + 4);
  }
}
