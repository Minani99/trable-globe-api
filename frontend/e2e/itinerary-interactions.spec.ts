import { expect, test, type Page } from "@playwright/test";

const country = { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.204824, longitude: 138.252924 };
async function register(page: Page) {
  const username = `route_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
  expect((await page.request.post("/api/auth/register", { data: { username, displayName: "일정 여행자", email: `${username}@example.com`, password: "itinerary-test-password-42" } })).status()).toBe(200);
  return username;
}
async function seed(page: Page) {
  await register(page);
  const response = await page.request.post("/api/private/travels", { data: {
    title: "교토의 세 장소", description: "천천히 걷는 여행", startDate: "2099-10-10", endDate: "2099-10-11", visibility: "PRIVATE", coverImageUrl: null,
    places: ["교토역", "니시키 시장", "가모강", "다음날 산책"].map((placeName, index) => ({ country, city: null, placeName, latitude: 35.01 + index * .01, longitude: 135.76, visitedAt: index === 3 ? "2099-10-11" : "2099-10-10", startTime: `${9 + index}:00`.padStart(5, "0"), durationMinutes: 60, memo: `메모 ${index}` })),
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
    const rows = page.locator(".editor-stop");
    await expect(rows).toHaveCount(3);
    await expect(rows.locator(".editor-stop__sequence")).toHaveText(["01", "02", "03"]);
    const handle = page.getByRole("button", { name: "교토역 순서 이동", exact: true });
    await handle.scrollIntoViewIfNeeded();
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
  const id = await seed(page);
  await page.goto(`/studio/travels/${id}/edit?plan=1`);
  await page.locator(".plan-share-panel summary").click();
  await page.getByRole("button", { name: "일정 공유 링크 만들기", exact: true }).click();
  const input = page.getByRole("textbox", { name: "공유 링크", exact: true });
  await expect(input).toHaveValue(/\/share\//);
  const url = await input.inputValue();
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto(url);
  await expect(visitor.getByRole("heading", { name: "교토의 세 장소", exact: true })).toBeVisible();
  const login = visitor.getByRole("link", { name: /로그인하고 내 계획으로 복사/ });
  await expect(login).toHaveAttribute("href", /next=%2Fshare%2F/);
  await register(visitor);
  await visitor.reload();
  await visitor.getByRole("button", { name: "내 계획으로 복사", exact: false }).click();
  await visitor.getByLabel("새 출발일").fill("2099-11-10");
  await visitor.getByRole("button", { name: "2일 일정 복사", exact: true }).click();
  await expect(visitor).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1/);
  const copyId = visitor.url().match(/travels\/(\d+)/)![1];
  const copy = (await (await visitor.request.get(`/api/private/travels/${copyId}`)).json()).data;
  expect(copy.places.map((place: { placeName: string }) => place.placeName)).toEqual(["교토역", "니시키 시장", "가모강", "다음날 산책"]);
  expect(copy.places[0]).toMatchObject({ memo: "메모 0", startTime: "09:00:00", durationMinutes: 60, visitedAt: "2099-11-10" });
  expect(copy.places[3].visitedAt).toBe("2099-11-11");
  expect(copy.photos).toEqual([]); expect(copy.visibility).toBe("PRIVATE");
  expect((await page.request.get(`/api/travels/${id}`)).status()).toBe(404);
  await page.getByRole("button", { name: "공유 끄기", exact: true }).click();
  await expect(page.getByText("공유를 껐습니다.", { exact: false })).toBeVisible();
  await visitor.goto(url);
  await expect(visitor.getByRole("heading", { name: "공유가 종료된 일정입니다" })).toBeVisible();
  expect((await visitor.request.get(`/api/private/travels/${copyId}`)).status()).toBe(200);
  await visitorContext.close();
});
