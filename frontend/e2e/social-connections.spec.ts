import { expect, test } from "@playwright/test";

test("팔로워와 팔로잉 목록에서 사람을 확인하고 다시 교류할 수 있다", async ({ page }, testInfo) => {
  const suffix = Date.now().toString(36);
  const firstUsername = `social_a_${suffix}`;
  const secondUsername = `social_b_${suffix}`;

  await register(page, firstUsername, "첫 번째 여행자");
  const travel = await page.request.post("/api/private/travels", { data: {
    title: "친구들과 함께한 길고 긴 도쿄 여행 기록", description: "", startDate: "2026-08-01", endDate: "2026-08-01",
    visibility: "PUBLIC", coverImageUrl: null, photos: [], places: [{
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2, longitude: 138.2 },
      city: null, placeName: "도쿄역", latitude: 35.68, longitude: 139.76, visitedAt: "2026-08-01", memo: null,
    }],
  } });
  expect(travel.status()).toBe(201);
  const travelId = (await travel.json()).data.id;
  await page.request.post("/api/auth/logout");
  await register(page, secondUsername, "두 번째 여행자");

  const followResponse = await page.request.post(
    `/api/private/discovery/profiles/${firstUsername}/follow`,
  );
  expect(followResponse.status()).toBe(200);
  expect((await page.request.post(`/api/private/travels/${travelId}/likes`)).status()).toBe(200);
  expect((await page.request.post(`/api/private/travels/${travelId}/comments`, { data: { content: "다음에는 함께 가고 싶어요. ".repeat(12) } })).status()).toBe(201);

  await page.goto(`/${firstUsername}`);
  await page.getByRole("button", { name: "프로필 정보 펼치기" }).click();
  await page.getByRole("button", { name: "1 팔로워" }).click();
  const followers = page.getByRole("dialog", { name: "팔로워" });
  await expect(followers).toBeVisible();
  await expect(followers.getByRole("link", { name: /두 번째 여행자/ })).toBeVisible();
  await followers.getByRole("button", { name: "팔로워 목록 닫기" }).click();

  await page.goto(`/${secondUsername}`);
  await page.getByRole("button", { name: "프로필 정보 펼치기" }).click();
  await page.getByRole("button", { name: "1 팔로잉" }).click();
  const following = page.getByRole("dialog", { name: "팔로잉" });
  await expect(following.getByRole("link", { name: /첫 번째 여행자/ })).toBeVisible();
  await expect(following.getByRole("button", { name: "팔로잉", exact: true })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${secondUsername}`);
  const mobileNavigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(mobileNavigation.locator(".site-mobile-bottom-nav__avatar")).toBeVisible();

  await page.request.post("/api/auth/logout");
  const loginResponse = await page.request.post("/api/auth/login", {
    data: { email: `${firstUsername}@example.com`, password: "social-password-42" },
  });
  expect(loginResponse.status()).toBe(200);
  await page.goto("/studio#activity");
  const activity = page.getByRole("region", { name: "최근 활동" });
  await expect(activity).toBeVisible();
  await expect(activity.getByText("두 번째 여행자", { exact: true })).toHaveCount(3);
  await expect(activity.getByText("내 여행 세계를 팔로우하기 시작했어요.", { exact: true })).toBeVisible();
  const rows = activity.locator("li");
  await expect(rows).toHaveCount(3);
  await expect(activity.getByRole("link", { name: /기록 관리/ })).toHaveCount(2);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await activity.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`activity-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const type of ["팔로우하기", "좋아해요", "이야기를 남겼어요"]) {
    const row = activity.locator("li").filter({ hasText: type });
    const person = row.getByRole("link", { name: "두 번째 여행자 프로필 보기", exact: true });
    await expect(person).toHaveAttribute("href", `/${secondUsername}`);
    await person.click();
    await expect(page).toHaveURL(new RegExp(`/${secondUsername}$`));
    await expect(page.getByRole("button", { name: "프로필 정보 펼치기" })).toBeVisible();
    await page.goBack();
    await expect(activity).toBeVisible();
  }
  const profileLink = activity.getByRole("link", { name: "두 번째 여행자 프로필 보기", exact: true }).first();
  await profileLink.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(new RegExp(`/${secondUsername}$`));
  await page.goBack();
  await activity.getByRole("link", { name: /기록 관리/ }).first().click();
  await expect(page).toHaveURL(new RegExp(`/studio/travels/${travelId}/edit$`));
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
      password: "social-password-42",
    },
  });
  expect(response.status()).toBe(200);
}
