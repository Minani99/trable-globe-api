import { expect, test } from "@playwright/test";

test("둘러보기는 공개 여행이 있는 프로필만 추천하고 새 친구는 검색으로 찾는다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const activeUsername = `world_${suffix}`;
  const emptyUsername = `empty_${suffix}`;
  const viewerUsername = `viewer_${suffix}`;

  await register(page, activeUsername, "세계가 있는 여행자");
  const profileResponse = await page.request.patch("/api/private/profile", {
    data: {
      displayName: "세계가 있는 여행자",
      bio: "도쿄와 타이베이를 오가며 도시의 장면을 기록합니다.",
      profileImageUrl: null,
    },
  });
  expect(profileResponse.status()).toBe(200);
  const travelResponse = await page.request.post("/api/private/travels", {
    data: {
      title: "도쿄와 타이베이 사이",
      description: "두 도시를 잇는 공개 Journey",
      startDate: "2026-08-01",
      endDate: "2026-08-04",
      coverImageUrl: null,
      visibility: "PUBLIC",
      places: [
        {
          country: {
            iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본",
            latitude: 36.204824, longitude: 138.252924,
          },
          city: {
            nameEn: "Tokyo", nameKo: "도쿄", latitude: 35.6762, longitude: 139.6503,
          },
          placeName: "도쿄역",
          latitude: 35.681236,
          longitude: 139.767125,
          visitedAt: "2026-08-01",
          memo: null,
        },
        {
          country: {
            iso2Code: "TW", iso3Code: "TWN", nameEn: "Taiwan", nameKo: "대만",
            latitude: 23.6978, longitude: 120.9605,
          },
          city: {
            nameEn: "Taipei", nameKo: "타이베이", latitude: 25.033, longitude: 121.5654,
          },
          placeName: "디화제",
          latitude: 25.0554,
          longitude: 121.51,
          visitedAt: "2026-08-03",
          memo: null,
        },
      ],
      photos: [],
    },
  });
  expect(travelResponse.status()).toBe(201);

  await page.request.post("/api/auth/logout");
  await register(page, emptyUsername, "아직 기록이 없는 친구");
  await page.request.post("/api/auth/logout");
  await register(page, viewerUsername, "둘러보는 여행자");

  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "다른 여행자의 기록" })).toBeVisible();
  const activeCard = page.locator(".member-card").filter({
    has: page.locator(`a[href="/${activeUsername}"]`),
  });
  await expect(activeCard).toBeVisible();
  await expect(activeCard.locator(".member-world-preview")).toBeVisible();
  await expect(activeCard).toContainText("나라 2 · 도시 2");
  await expect(activeCard).toContainText("최근 여행 도쿄 · 타이베이");
  await expect(page.locator(".member-card").filter({
    has: page.locator(`a[href="/${emptyUsername}"]`),
  })).toHaveCount(0);

  await page.getByRole("searchbox", { name: "다른 여행자 검색" }).fill(emptyUsername);
  const emptyCard = page.locator(".member-card").filter({
    has: page.locator(`a[href="/${emptyUsername}"]`),
  });
  await expect(emptyCard).toBeVisible();
  await expect(emptyCard).toContainText("첫 여행을 준비하고 있습니다.");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/discover");
  await expect(page.locator(".member-card").filter({
    has: page.locator(`a[href="/${activeUsername}"]`),
  })).toBeVisible();
  const hasPageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasPageOverflow).toBe(false);
});

async function register(
  page: import("@playwright/test").Page,
  username: string,
  displayName: string,
) {
  const response = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName,
      email: `${username}@example.com`,
      password: "discover-password-42",
    },
  });
  expect(response.status()).toBe(200);
}

test("검색어를 바꾸거나 지우면 늦게 도착한 이전 결과가 다시 표시되지 않는다", async ({ page }) => {
  let releaseOld!: () => void;
  let releaseNew!: () => void;
  const oldResponse = new Promise<void>((resolve) => { releaseOld = resolve; });
  const newResponse = new Promise<void>((resolve) => { releaseNew = resolve; });
  await page.route("**/api/discovery/search?**", async (route) => {
    const query = new URL(route.request().url()).searchParams.get("query");
    await (query === "old" ? oldResponse : newResponse);
    await route.fulfill({ json: { success: true, data: [{
      username: query, displayName: query === "old" ? "이전 검색 사용자" : "새 검색 사용자",
      profileImageUrl: null, bio: null, travelCount: 0, cityCount: 0, countryCount: 0,
      recentDestinations: [], worldCountries: [], recommendationReason: "검색 결과", following: false,
    }] } });
  });
  await page.goto("/discover");
  const search = page.getByRole("searchbox", { name: "다른 여행자 검색" });
  const oldRequest = page.waitForRequest("**/api/discovery/search?query=old&*");
  await search.fill("old");
  await oldRequest;
  const newRequest = page.waitForRequest("**/api/discovery/search?query=new&*");
  await search.fill("new");
  const oldFinished = page.waitForResponse("**/api/discovery/search?query=old&*");
  releaseOld();
  await oldFinished;
  await expect(page.getByText("이전 검색 사용자", { exact: true })).toHaveCount(0);
  await expect(page.getByText("일치하는 여행자가 없습니다", { exact: true })).toHaveCount(0);
  await newRequest;
  await page.getByRole("button", { name: "검색어 지우기" }).click();
  const newFinished = page.waitForResponse("**/api/discovery/search?query=new&*");
  releaseNew();
  await newFinished;
  await expect(page.getByRole("heading", { name: "기록이 있는 여행자" })).toBeVisible();
  await expect(page.getByText("새 검색 사용자", { exact: true })).toHaveCount(0);
});
