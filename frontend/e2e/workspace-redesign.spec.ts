import { expect, test, type Page } from "@playwright/test";

const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
function future(days: number) { const date = new Date(`${today}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); }

async function seed(page: Page) {
  const username = `workspace_${Date.now().toString(36)}`;
  const registration = await page.request.post("/api/auth/register", { data: { username, displayName: "여행 노트", email: `${username}@example.com`, password: "workspace-test-only-42" } });
  expect(registration.status()).toBe(200);
  const response = await page.request.post("/api/private/travels", { data: {
    title: "교토에서 보내는 가을", description: "걷다가 마음에 드는 곳에 머물기", startDate: future(14), endDate: future(16), coverImageUrl: null, visibility: "PRIVATE",
    places: ["후시미 이나리", "니시키 시장", "가모강"].map((placeName, index) => ({
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2048, longitude: 138.2529 },
      city: { nameEn: "Kyoto", nameKo: "교토", latitude: 35.0116, longitude: 135.7681 },
      placeName, latitude: 35.0116, longitude: 135.7681, visitedAt: future(14), startTime: ["10:00", "12:30", "15:00"][index], durationMinutes: 90, memo: null,
    })), photos: [],
  } });
  expect(response.status()).toBe(201);
  await page.route("**/api/weather/forecast?**", (route) => route.fulfill({ json: { success: true, data: { available: false, availableFrom: null, days: [] } } }));
  return (await response.json()).data.id as number;
}

for (const width of [390, 1440]) {
  test(`${width}px 일정 중심 작업 공간은 탭 이동 중 입력을 유지하고 저장한다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 960 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const id = await seed(page);
    await page.goto(`/studio/travels/${id}/edit?plan=1`);
    const tabs = page.getByRole("tablist", { name: "여행 작업", exact: true });
    await expect(tabs.getByRole("tab", { name: "일정", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("button", { name: /후시미 이나리.*편집/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "예약과 여행 준비" })).toBeHidden();
    await expect(page.getByRole("textbox", { name: "장소 이름", exact: true })).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`workspace-${width}.png`), fullPage: true });

    await page.getByRole("button", { name: /후시미 이나리.*편집/ }).click();
    await page.getByRole("textbox", { name: "장소 이름", exact: true }).fill("후시미 이나리 산책");
    await tabs.getByRole("tab", { name: "여행 정보", exact: true }).click();
    await page.getByLabel("여행 제목", { exact: true }).fill("교토의 느린 가을");
    await tabs.getByRole("tab", { name: "사진·메모", exact: true }).click();
    await page.getByLabel("여행 메모").fill("아침에는 신사, 오후에는 강변 산책");
    await tabs.getByRole("tab", { name: "예산·예약", exact: true }).click();
    await expect(page.getByRole("heading", { name: "예산과 예약" })).toBeVisible();
    await tabs.getByRole("tab", { name: "일정", exact: true }).click();
    await expect(page.getByRole("textbox", { name: "장소 이름", exact: true })).toHaveValue("후시미 이나리 산책");
    await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/studio/travels/${id}/edit`));
    const saved = (await (await page.request.get(`/api/private/travels/${id}`)).json()).data;
    expect(saved.title).toBe("교토의 느린 가을");
    expect(saved.description).toBe("아침에는 신사, 오후에는 강변 산책");
    expect(saved.places[0].placeName).toBe("후시미 이나리 산책");
    expect(saved.visibility).toBe("PRIVATE");

    await tabs.getByRole("tab", { name: "여행 정보", exact: true }).click();
    await page.getByLabel("여행 제목", { exact: true }).fill("");
    await tabs.getByRole("tab", { name: "사진·메모", exact: true }).click();
    await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
    await expect(tabs.getByRole("tab", { name: "여행 정보", exact: true })).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".editor-notice")).toContainText("여행 제목을 입력");
    await page.getByLabel("여행 제목", { exact: true }).fill("교토의 느린 가을");
    await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
    await page.goto(`/studio/travels/${id}/edit#travel-budget`);
    await expect(tabs.getByRole("tab", { name: "예산·예약", exact: true })).toHaveAttribute("aria-selected", "true");
    await tabs.getByRole("tab", { name: "예산·예약", exact: true }).press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: "준비물", exact: true })).toBeFocused();
    await expect(page.getByRole("heading", { name: "여행 준비 체크리스트" })).toBeVisible();

    await page.goto("/studio");
    await page.getByRole("tab", { name: "계획 중", exact: true }).click();
    await expect(page.getByRole("region", { name: "내 여행 목록" })).toContainText("교토의 느린 가을");
    await page.getByLabel("내 여행 검색").fill("없는 여행");
    await expect(page.getByRole("heading", { name: "검색된 여행이 없습니다" })).toBeVisible();
    await page.getByLabel("내 여행 검색").fill("");
    await page.getByRole("tab", { name: "전체", exact: true }).click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`library-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("공개 화면은 작은 화면과 어두운 화면에서도 읽을 수 있다", async ({ page }, testInfo) => {
  for (const width of [360, 1440]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "다음 여행을 펼쳐보세요." })).toBeVisible();
    await expect(page.locator(".landing-globe-frame canvas")).toBeVisible({ timeout: 45000 });
    await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  }
  await page.getByRole("button", { name: "어두운 화면으로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: testInfo.outputPath("home-dark.png"), fullPage: true });
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "다른 여행자의 기록" })).toBeVisible();
  await expect(page.locator(".member-card").first()).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("discover-dark.png"), fullPage: true });
});

test("새 여행은 세 단계로 만들고 바로 일정을 편집한다", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seed(page);
  await page.goto("/studio/plans/new");
  const navigation = page.getByRole("navigation", { name: "여행 계획 단계 이동" });
  await expect(page.getByRole("progressbar", { name: "여행 계획 작성 진행률" })).toHaveAttribute("aria-valuemax", "3");
  await navigation.getByRole("button", { name: "다음" }).click();
  await expect(page.locator(".pb-mobile-error")).toContainText("나라를 먼저");
  await page.getByRole("button", { name: "일본", exact: true }).click();
  await page.getByRole("button", { name: "2박 3일" }).click();
  await navigation.getByRole("button", { name: "다음" }).click();
  await expect(page.getByRole("button", { name: /직접 일정 채우기/ })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "혼자", exact: true })).toBeHidden();
  await page.screenshot({ path: testInfo.outputPath("new-plan-mobile.png"), fullPage: true });
  await navigation.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "일정 만들기", exact: true }).click();
  await expect(page).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1$/);
  await expect(page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".editor-stop__summary").first()).toBeVisible();
});

test("저장한 사진을 다시 편집해도 다음 저장 전에는 파일을 삭제하지 않는다", async ({ page }) => {
  const id = await seed(page);
  const photoUrl = "https://images.travel-globe.test/workspace-photo.webp";
  const deletions: unknown[] = [];
  await page.route("**/api/uploads/presign", (route) => route.fulfill({ json: {
    success: true,
    data: route.request().method() === "GET"
      ? { configured: true, maxBytes: 10 * 1024 * 1024, maxPhotos: 30, acceptedTypes: ["image/jpeg", "image/png", "image/webp"] }
      : { objectKey: "members/test/photos/workspace-photo.webp", uploadUrl: "https://upload.travel-globe.test/workspace-photo.webp", publicUrl: photoUrl, expiresInSeconds: 300 },
  } }));
  await page.route("https://upload.travel-globe.test/**", (route) => route.fulfill({ status: 200, body: "" }));
  await page.route("**/api/uploads/object", (route) => {
    deletions.push(route.request().postDataJSON());
    return route.fulfill({ json: { success: true, data: null } });
  });
  await page.goto(`/studio/travels/${id}/edit#travel-photo-editor`);
  const editor = page.locator("#travel-photo-editor");
  const save = page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true });
  await expect(editor.getByText("사진을 선택하거나 이곳에 놓아 주세요", { exact: true })).toBeVisible();
  await editor.locator('input[type="file"]').setInputFiles({
    name: "photo.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"),
  });
  await expect(editor.locator(".travel-editor__photos li")).toHaveCount(1);
  await expect(editor.getByRole("img", { name: "여행 사진 1" })).toHaveAttribute("src", photoUrl);
  await save.click();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "삭제", exact: true }).click();
  await expect(editor.getByText("아직 사진이 없습니다.")).toBeVisible();
  expect(deletions).toEqual([]);
  const beforeSave = (await (await page.request.get(`/api/private/travels/${id}`)).json()).data;
  expect(beforeSave.photos[0].imageUrl).toBe(photoUrl);
  await save.click();
  await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
  await expect.poll(() => deletions).toEqual([{ publicUrl: photoUrl }]);
  const afterSave = (await (await page.request.get(`/api/private/travels/${id}`)).json()).data;
  expect(afterSave.photos).toEqual([]);
});
