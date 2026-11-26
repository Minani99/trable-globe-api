import { expect, test } from "./fixtures";

for (const width of [320, 390, 1440]) {
  test(`${width}px 국내여행은 지역·동행을 저장하고 국내 교통과 준비물을 보여준다`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const username = `domestic_${width}_${Date.now().toString(36)}`;
    expect((await page.request.post("/api/auth/register", { data: { username, displayName: "국내 여행자", email: `${username}@example.com`, password: "domestic-travel-test-42" } })).ok()).toBe(true);
    await page.route("**/api/weather/forecast?**", route => route.fulfill({ json: { success: true, data: { available: false, days: [] } } }));
    let locationQueries = 0;
    await page.route("**/api/locations/search?**", route => {
      const params = new URL(route.request().url()).searchParams;
      expect(params.get("country")).toBe("kr");
      expect(params.get("q")).toBe("강릉");
      expect(params.get("purpose")).toBe("region");
      expect(params.has("lat")).toBe(false);
      locationQueries++;
      return route.fulfill({ json: { success: true, data: [{ name: "강릉", city: "강릉", latitude: 37.7519, longitude: 128.8761 }] } });
    });
    let recommendations = 0;
    await page.route("**/api/places/recommend?**", route => {
      const params = new URL(route.request().url()).searchParams;
      expect(params.get("lat")).toBe("37.7519");
      expect(params.get("lng")).toBe("128.8761");
      recommendations++;
      return route.fulfill({ json: { success: true, data: [] } });
    });
    await page.goto("/studio/plans/new");
    await expect(page.getByRole("button", { name: "국내여행", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "강릉", exact: true }).click();
    await page.getByRole("button", { name: "당일", exact: true }).click();
    const nav = page.getByRole("navigation", { name: "여행 계획 단계 이동" });
    if (width < 700) await nav.getByRole("button", { name: "다음" }).click();
    await page.getByRole("button", { name: "부모님과", exact: true }).click();
    await page.getByRole("button", { name: /느긋하게/ }).click();
    await page.getByRole("button", { name: "자연", exact: true }).click();
    if (width === 390) await page.getByRole("button", { name: /추천 일정으로 시작/ }).click();
    if (width < 700) {
      await nav.getByRole("button", { name: "이전" }).click();
      await expect(page.getByLabel("여행할 도시·지역")).toHaveValue("강릉");
      await nav.getByRole("button", { name: "다음" }).click();
      await expect(page.getByRole("button", { name: "부모님과", exact: true })).toHaveAttribute("aria-pressed", "true");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`domestic-setup-${width}.png`), fullPage: true });
    if (width === 390) {
      await page.getByRole("button", { name: "어두운 화면으로 전환" }).click();
      const choice = page.getByRole("button", { name: "자연", exact: true });
      await expect.poll(() => choice.evaluate(button => {
        const icon = button.querySelector("svg")!;
        return getComputedStyle(icon).stroke === getComputedStyle(button).color;
      })).toBe(true);
      await expect(choice).toHaveAttribute("aria-pressed", "true");
      await page.screenshot({ path: testInfo.outputPath("mobile-choices-dark.png") });
      await page.getByRole("button", { name: "밝은 화면으로 전환" }).click();
    }
    if (width < 700) await nav.getByRole("button", { name: "다음" }).click();
    await expect(page.getByRole("complementary", { name: "여행 계획 요약" })).toContainText("부모님과");
    if (width === 390) {
      await page.reload();
      await expect(page.getByText("이 탭에서 작성하던 계획을 불러왔어요.")).toBeVisible();
      const summary = page.getByRole("complementary", { name: "여행 계획 요약" });
      await expect(summary).toContainText("강릉 여행");
      await expect(summary).toContainText("부모님과");
      await expect.poll(() => summary.locator(".pb-flag img").evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
      await page.screenshot({ path: testInfo.outputPath("restored-plan-summary.png"), fullPage: true });
      await summary.getByRole("button", { name: "여행지·날짜 수정" }).click();
      await page.reload();
      await expect(page.getByLabel("여행할 도시·지역")).toHaveValue("강릉");
      await nav.getByRole("button", { name: "요약으로 돌아가기" }).click();
    }
    await page.getByRole("button", { name: width === 390 ? "자동 일정 만들기" : "일정 만들기", exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1$/, { timeout: 30_000 });
    const id = page.url().match(/travels\/(\d+)/)![1];
    const travel = (await (await page.request.get(`/api/private/travels/${id}`)).json()).data;
    expect(travel.title).toBe("강릉 1일 여행");
    if (width === 390) {
      expect(await page.evaluate(() => Object.keys(sessionStorage).some(key => key.startsWith("plan-setup.v1:")))).toBe(false);
    }
    expect(travel.description).toContain("부모님과");
    expect(travel.description).toContain("느긋하게");
    expect(travel.places[0]).toMatchObject({ latitude: 37.7519, longitude: 128.8761, country: { iso2Code: "KR" }, city: { nameKo: "강릉" } });
    expect(locationQueries).toBe(1);
    expect(recommendations).toBe(width === 390 ? 3 : 0);
    await page.reload();
    const tabs = page.getByRole("tablist", { name: "여행 작업", exact: true });
    await tabs.getByRole("tab", { name: "교통", exact: true }).click();
    await expect(page.getByRole("heading", { name: "여행지까지 어떻게 갈까요?" })).toBeVisible();
    await page.getByRole("button", { name: "자가용·렌터카", exact: true }).click();
    await expect(page.getByRole("heading", { name: "운전과 주차 준비" })).toBeVisible();
    await page.getByRole("link", { name: "교통 예약·비용 기록하기" }).click();
    await expect(tabs.getByRole("tab", { name: "예산·예약", exact: true })).toHaveAttribute("aria-selected", "true");
    await tabs.getByRole("tab", { name: "준비물", exact: true }).click();
    await expect(page.locator(".travel-checklist")).toContainText("교통카드·결제수단 준비");
    await expect(page.locator(".travel-checklist")).not.toContainText("여권");
    await expect(page.locator(".travel-checklist")).not.toContainText("환전");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 320) {
      await page.goto(`/studio/travels/${id}/go`);
      await expect(page.getByRole("region", { name: "강릉 여행 날씨" })).toBeVisible();
    }
  });
}
