import { expect, test } from "@playwright/test";

test("연도 링크를 열고 바꾸면 지구본, 기록, 리캡과 공유 주소가 함께 바뀐다", async ({ page }) => {
  const pageErrors: string[] = [];
  let recapImageRequests = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/og/profile?username=traveler&year=2026")) {
      recapImageRequests += 1;
    }
  });

  await page.goto("/traveler?year=2025");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const yearFilter = page.getByRole("group", { name: "여행 연도 필터" });
  const countryList = page.getByRole("navigation", { name: "방문한 국가 목록" });
  await expect(yearFilter).toBeVisible();
  await expect(page).toHaveURL(/\/traveler\?year=2025$/);
  await expect(page).toHaveTitle(/2025 여행 세계/);
  const ogImageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
  expect(ogImageUrl).toContain("/api/og/profile?username=traveler&year=2025");
  const ogImage = await page.request.get(ogImageUrl!);
  expect(ogImage.ok()).toBeTruthy();
  expect(ogImage.headers()["content-type"]).toContain("image/png");
  expect((await ogImage.body()).byteLength).toBeGreaterThan(20_000);
  await expect(yearFilter.getByRole("button", { name: "2025" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "2025년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "그해의 여행 리듬" })).toBeVisible();
  await expect(page.locator(".travel-recap__month-chart .is-active")).toHaveCount(3);
  await expect(page.locator(".travel-recap__cities li")).toHaveCount(3);
  await expect(page.locator(".travel-recap__comparison")).toHaveCount(0);
  await expect(page.locator(".travel-recap__memories a")).toHaveCount(3);
  await expect(page.locator(".travel-card")).toHaveCount(3);

  await yearFilter.getByRole("button", { name: "2026" }).click();
  await expect(page).toHaveURL(/\/traveler\?year=2026$/);
  await expect(page.getByRole("heading", { name: "2026년, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-recap__month-chart .is-active")).toHaveCount(2);
  await expect(page.locator(".travel-recap__cities li")).toHaveCount(2);
  const comparison = page.locator(".travel-recap__comparison");
  await expect(comparison.getByRole("heading", { name: "2025년과 2026년 비교" })).toBeVisible();
  await expect(comparison).toContainText("지구본에는 대만의 기억이 새로 더해졌습니다.");
  await expect(comparison.getByRole("list", { name: "새로 더해진 나라" })).toContainText("대만");
  await expect(page.locator(".travel-recap__memories a")).toHaveCount(2);
  await expect(page.locator(".travel-card")).toHaveCount(2);
  await expect(countryList.getByRole("button", { name: /대만/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /일본/ })).toBeVisible();
  await expect(countryList.getByRole("button", { name: /미국/ })).toHaveCount(0);
  await expect(page.locator("#timeline-2026")).toBeVisible();
  await expect(page.locator("#timeline-2025")).toHaveCount(0);

  const recapActions = page.locator(".recap-actions");
  const downloadPromise = page.waitForEvent("download");
  await recapActions.getByRole("button", { name: "이미지 저장" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("travel-globe-traveler-2026.png");
  await expect(recapActions.getByRole("status")).toHaveText("리캡 이미지를 저장했습니다.");

  await recapActions.getByRole("button", { name: "리캡 공유" }).click();
  await expect(recapActions.getByRole("status")).toHaveText("리캡 링크를 복사했습니다.");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("/traveler?year=2026");

  await page.evaluate(() => {
    const testWindow = window as typeof window & {
      sharedRecapFilename?: string;
      sharedRecapText?: string;
    };
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: (data: ShareData) => Boolean(data.files?.length),
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        testWindow.sharedRecapFilename = data.files?.[0]?.name;
        testWindow.sharedRecapText = data.text;
      },
    });
  });
  await recapActions.getByRole("button", { name: "리캡 공유" }).click();
  await expect(recapActions.getByRole("status")).toHaveText("리캡 이미지를 공유했습니다.");
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { sharedRecapFilename?: string }
  ).sharedRecapFilename)).toBe("travel-globe-traveler-2026.png");
  await expect.poll(() => page.evaluate(() => (
    window as typeof window & { sharedRecapText?: string }
  ).sharedRecapText)).toContain("지구본에는 대만의 기억이 새로 더해졌습니다.");
  expect(recapImageRequests).toBe(1);

  await yearFilter.getByRole("button", { name: "전체" }).click();
  await expect(page).toHaveURL(/\/traveler$/);
  await expect(page.getByRole("heading", { name: "지금까지, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(5);

  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});
