import { expect, test } from "@playwright/test";

test("내 연도 리캡의 문장과 대표 여행을 모바일에서도 편집한다", async ({ page }, testInfo) => {
  const suffix = Date.now().toString(36);
  const username = `recap_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "리캡 편집 테스트",
      email: `${username}@example.com`,
      password: "recap-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  for (const [index, title] of ["봄의 서울", "여름의 부산"].entries()) {
    const day = index + 1;
    const createResponse = await page.request.post("/api/private/travels", {
      data: {
        title,
        description: `${title} 기록`,
        startDate: `2026-08-0${day}`,
        endDate: `2026-08-0${day}`,
        coverImageUrl: `/placeholders/photo-0${day + 1}.svg`,
        visibility: "PUBLIC",
        places: [{
          country: { iso2Code: "KR", iso3Code: "KOR", nameEn: "South Korea", nameKo: "대한민국", latitude: 35.907757, longitude: 127.766922 },
          city: { nameEn: index === 0 ? "Seoul" : "Busan", nameKo: index === 0 ? "서울" : "부산", latitude: index === 0 ? 37.566535 : 35.179554, longitude: index === 0 ? 126.977969 : 129.075642 },
          placeName: index === 0 ? "서울숲" : "광안리해수욕장",
          latitude: index === 0 ? 37.544387 : 35.153169,
          longitude: index === 0 ? 127.037442 : 129.118667,
          visitedAt: `2026-08-0${day}`,
          memo: null,
        }],
        photos: [],
      },
    });
    expect(createResponse.status()).toBe(201);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${username}?year=2026`);
  await expect(page.getByRole("heading", { name: "2026년, 내가 만든 여행 세계" })).toBeVisible();
  await page.getByRole("button", { name: "리캡 편집" }).click();
  await expect(page.getByText("2026 리캡 편집", { exact: true })).toBeVisible();

  await page.getByLabel("리캡 한 문장").fill("올해는 익숙한 도시를 천천히 다시 걸었다.");
  const choices = page.locator(".travel-recap-editor__travels input");
  await choices.first().check();
  await page.screenshot({ path: testInfo.outputPath("recap-editor-mobile.png"), fullPage: true });
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);

  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("올해는 익숙한 도시를 천천히 다시 걸었다.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("올해는 익숙한 도시를 천천히 다시 걸었다.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "리캡 자세히 보기" }).click();
  await expect(page.locator(".travel-recap__memories a")).toHaveCount(1);

  await page.getByRole("button", { name: "리캡 편집" }).click();
  await page.getByRole("button", { name: "기본으로 되돌리기" }).click();
  await expect(page.getByText("올해는 익숙한 도시를 천천히 다시 걸었다.", { exact: true })).toHaveCount(0);
});

test("연도 링크를 열고 바꾸면 지구본, 기록, 리캡과 공유 주소가 함께 바뀐다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

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
  const recapDetailsToggle = page.getByRole("button", { name: "리캡 자세히 보기" });
  await expect(recapDetailsToggle).toHaveAttribute("aria-expanded", "false");
  await recapDetailsToggle.click();
  await expect(page.getByRole("button", { name: "리캡 접기" })).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("heading", { name: "그해의 여행 리듬" })).toBeVisible();
  await expect(page.locator(".travel-recap__month-chart .is-active")).toHaveCount(3);
  await expect(page.locator(".travel-recap__cities li")).toHaveCount(3);
  await expect(
    page.locator(".travel-recap__comparison").getByRole("heading", { name: "2024년과 2025년 비교" }),
  ).toBeVisible();
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

  await yearFilter.getByRole("button", { name: "전체" }).click();
  await expect(page).toHaveURL(/\/traveler$/);
  await expect(page.getByRole("heading", { name: "지금까지, 내가 만든 여행 세계" })).toBeVisible();
  await expect(page.locator(".travel-card")).toHaveCount(7);

  await page.setViewportSize({ width: 390, height: 844 });
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});

test("연도 리캡 이미지를 저장하고 링크와 네이티브 공유로 전달한다", async ({ page }) => {
  const pageErrors: string[] = [];
  let recapImageRequests = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/api/og/profile?username=traveler&year=2026")) {
      recapImageRequests += 1;
    }
  });

  await page.goto("/traveler?year=2026");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "2026년, 내가 만든 여행 세계" })).toBeVisible();

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
  expect(pageErrors).toEqual([]);
});
