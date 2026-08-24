import { expect, test } from "@playwright/test";

test("팔로워와 팔로잉 목록에서 사람을 확인하고 다시 교류할 수 있다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const firstUsername = `social_a_${suffix}`;
  const secondUsername = `social_b_${suffix}`;

  await register(page, firstUsername, "첫 번째 여행자");
  await page.request.post("/api/auth/logout");
  await register(page, secondUsername, "두 번째 여행자");

  const followResponse = await page.request.post(
    `/api/private/discovery/profiles/${firstUsername}/follow`,
  );
  expect(followResponse.status()).toBe(200);

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
