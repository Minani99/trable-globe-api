import { blockGoogleMaps, expect, test, type Page } from "./fixtures";

const country = { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.204824, longitude: 138.252924 };
async function register(page: Page) {
  const username = `route_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "일정 여행자", email: `${username}@example.com`, password: "itinerary-test-password-42" } })).status()).toBe(200);
  return username;
}
async function seed(page: Page, extraStops: string[] = []) {
  await register(page);
  const response = await page.request.post("/api/private/travels", { data: {
    title: "교토의 세 장소", description: "천천히 걷는 여행", startDate: "2099-10-10", endDate: "2099-10-11", visibility: "PRIVATE", coverImageUrl: null,
    places: ["교토역", "니시키 시장", "가모강", "다음날 산책", ...extraStops].map((placeName, index) => ({ country, city: null, placeName, latitude: 35.01 + index * .01, longitude: 135.76, visitedAt: index >= 3 ? "2099-10-11" : "2099-10-10", startTime: `${9 + index}:00`.padStart(5, "0"), durationMinutes: 60, memo: `메모 ${index}` })),
    photos: [{ imageUrl: "https://images.example.com/kyoto.jpg", caption: "교토역 사진", takenAt: "2099-10-10", placeIndex: 0 }],
  } });
  expect(response.status()).toBe(201);
  return (await response.json()).data.id as number;
}

for (const width of [390, 1280]) {
  test(`방문 순번·드래그·사진 연결·삭제 구분 (${width}px)`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const id = await seed(page);
    await page.goto(`/studio/travels/${id}/edit?plan=1`);
  await page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true }).click();
    const rows = page.locator(".editor-stop");
    await expect(rows).toHaveCount(3);
    await expect(rows.locator(".editor-stop__sequence")).toHaveText(["01", "02", "03"]);
    const handle = page.getByRole("button", { name: "교토역 순서 이동", exact: true });
    // Keep both ends in view before sending raw touch coordinates. The route
    // panel above the list can put the destination behind the fixed save bar.
    await page.locator(".travel-editor__places").evaluate((list) => list.scrollIntoView({ block: "center", behavior: "instant" }));
    await expect(handle).toBeInViewport();
    const from = (await handle.boundingBox())!;
    const to = (await rows.nth(2).boundingBox())!;
    const x = from.x + from.width / 2, y = from.y + from.height / 2, targetY = to.y + to.height / 2;
    if (width === 390) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: targetY }] });
      await expect(rows.nth(2)).toHaveClass(/is-drop-target/);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await cdp.detach();
    } else {
      await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, targetY, { steps: 12 });
      await expect(rows.nth(2)).toHaveClass(/is-drop-target/);
      await page.mouse.up();
    }
    await expect(rows.locator(".editor-stop__summary strong")).toHaveText(["니시키 시장", "가모강", "교토역"]);
    await expect(rows.nth(2)).toContainText("09:00");
    await page.locator(".editor-savebar").getByRole("button", { name: "저장", exact: true }).click();
    await expect(page.getByText("서버에 저장됨", { exact: true })).toBeVisible();
    const saved = (await (await page.request.get(`/api/private/travels/${id}`)).json()).data;
    expect(saved.places.map((place: { placeName: string }) => place.placeName)).toEqual(["니시키 시장", "가모강", "교토역", "다음날 산책"]);
    expect(saved.photos[0].travelPlaceId).toBe(saved.places[2].id);
    await page.reload();
    await expect(rows.locator(".editor-stop__summary strong")).toHaveText(["니시키 시장", "가모강", "교토역"]);
    await page.getByRole("button", { name: "교토역 순서 이동", exact: true }).press("ArrowUp");
    await expect(rows.nth(1)).toContainText("교토역");
    await rows.nth(1).locator(".editor-stop__summary").click();
    await rows.nth(1).getByRole("button", { name: "편집 닫기", exact: true }).click();
    await expect(rows).toHaveCount(3);
    await rows.nth(1).locator(".editor-stop__summary").click();
    page.once("dialog", (dialog) => dialog.dismiss());
    await rows.nth(1).getByRole("button", { name: "장소 삭제", exact: true }).click();
    await expect(rows).toHaveCount(3);
    page.once("dialog", (dialog) => dialog.accept());
    await rows.nth(1).getByRole("button", { name: "장소 삭제", exact: true }).click();
    await expect(rows).toHaveCount(2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`itinerary-${width}.png`) });
  });
}

test("미래의 비공개 계획을 링크로 공유·복사하고 공유를 끈다", async ({ page, browser }) => {
  const id = await seed(page, ["이미 가본 카페"]);
  await page.goto(`/studio/travels/${id}/edit?plan=1`);
  await page.getByRole("tablist", { name: "여행 작업", exact: true }).getByRole("tab", { name: "일정", exact: true }).click();
  await page.locator(".plan-share-panel summary").click();
  await page.getByRole("button", { name: "일정 공유 링크 만들기", exact: true }).click();
  const input = page.getByRole("textbox", { name: "공유 링크", exact: true });
  await expect(input).toHaveValue(/\/share\//);
  const url = await input.inputValue();
  const dayPage = await page.context().newPage();
  await dayPage.goto(url);
  await dayPage.getByRole("group", { name: "경로 날짜 선택" }).getByRole("button", { name: /2일차/ }).click();
  await dayPage.getByRole("link", { name: "2일차 코스 정보 작성" }).click();
  await expect(dayPage.getByLabel("누구와 갔나요?")).toBeVisible();
  await dayPage.getByLabel("누구와 갔나요?").selectOption("부모님과");
  await dayPage.getByLabel("이동수단", { exact: true }).selectOption("도보");
  await dayPage.getByLabel("다시 간다면", { exact: true }).fill("다음에는 강변부터 걸을래요.");
  await dayPage.reload();
  await expect(dayPage.getByLabel("다시 간다면", { exact: true })).toHaveValue("다음에는 강변부터 걸을래요.");
  await expect(dayPage.getByLabel("이동수단", { exact: true })).toHaveValue("도보");
  await expect(dayPage.getByLabel("누구와 갔나요?")).toHaveValue("부모님과");
  await dayPage.getByRole("button", { name: "코스 정보 저장" }).click();
  await expect(dayPage.locator(".course-day-editor")).toContainText("저장했습니다.");
  await dayPage.reload();
  await expect(dayPage.getByLabel("다시 간다면", { exact: true })).toHaveValue("다음에는 강변부터 걸을래요.");
  await expect(dayPage.getByText("이 탭에 임시 저장됨")).toHaveCount(0);
  await dayPage.close();
  const visitorContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await blockGoogleMaps(visitorContext);
  const visitor = await visitorContext.newPage();
  await visitor.goto(url);
  await expect(visitor.getByRole("heading", { name: "교토의 세 장소", exact: true })).toBeVisible();
  await visitor.getByRole("group", { name: "경로 날짜 선택" }).getByRole("button", { name: /2일차.*후기/ }).click();
  await expect(visitor.getByRole("link", { name: /코스 정보 수정/ })).toHaveCount(0);
  await expect(visitor.getByText("부모님과 · 도보", { exact: true })).toBeVisible();
  await expect(visitor.getByText("다음에는 강변부터 걸을래요.", { exact: false })).toBeVisible();
  await visitor.getByRole("button", { name: "2일차 코스 가져오기" }).click();
  await expect(visitor.getByLabel("새 출발일")).toBeFocused();
  await expect(visitor.getByRole("list", { name: "선택한 하루의 방문 순서" })).toContainText("다음날 산책");
  await visitor.getByRole("checkbox", { name: "이미 가본 카페" }).uncheck();
  await visitor.getByLabel("새 출발일").fill("2099-11-10");
  await expect(visitor.locator("#copy-date-summary time")).toHaveCount(1);
  await visitor.getByRole("button", { name: "복사 옵션 접기" }).click();
  const routeTrigger = visitor.getByRole("button", { name: "2일차 코스 가져오기" });
  await expect(routeTrigger).toBeFocused();
  await expect(routeTrigger).toBeInViewport();
  await visitor.getByRole("button", { name: /내 계획으로 복사/ }).click();
  await expect(visitor.getByLabel("새 출발일")).toHaveValue("2099-11-10");
  const login = visitor.getByRole("link", { name: "로그인하고 계속" });
  await expect(login).toHaveAttribute("href", /next=%2Fshare%2F/);
  await visitor.getByRole("link", { name: "가입하고 계속" }).click();
  const username = `copy_${Date.now().toString(36)}`;
  await visitor.getByLabel("보여질 이름", { exact: true }).fill("동행 여행자");
  await visitor.getByLabel("사용자명", { exact: true }).fill(username);
  await visitor.getByLabel("이메일", { exact: true }).fill(`${username}@example.com`);
  await visitor.locator('input[name="password"]').fill("shared-trip-test-42");
  await visitor.getByRole("button", { name: "계정 만들기" }).click();
  await expect(visitor.getByLabel("새 출발일")).toHaveValue("2099-11-10", { timeout: 30_000 });
  await expect(visitor.getByLabel("가져올 코스")).toHaveValue("2099-10-11");
  await visitor.getByRole("button", { name: "1일 일정 복사", exact: true }).click();
  await expect(visitor).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1/);
  const copyId = visitor.url().match(/travels\/(\d+)/)![1];
  const copy = (await (await visitor.request.get(`/api/private/travels/${copyId}`)).json()).data;
  expect(copy).toMatchObject({ startDate: "2099-11-10", endDate: "2099-11-10" });
  expect(copy.places).toHaveLength(1);
  expect(copy.places[0]).toMatchObject({ placeName: "다음날 산책", memo: "메모 3", startTime: "12:00:00", durationMinutes: 60, visitedAt: "2099-11-10" });
  expect(copy.photos).toEqual([]); expect(copy.visibility).toBe("PRIVATE");
  expect((await page.request.get(`/api/travels/${id}`)).status()).toBe(404);
  await page.getByRole("button", { name: "공유 끄기", exact: true }).click();
  await expect(page.getByText("공유를 껐습니다.", { exact: false })).toBeVisible();
  await visitor.goto(url);
  await expect(visitor.getByRole("heading", { name: "공유가 종료된 일정입니다" })).toBeVisible();
  expect((await visitor.request.get(`/api/private/travels/${copyId}`)).status()).toBe(200);
  await visitorContext.close();
});
