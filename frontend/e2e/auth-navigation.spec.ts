import { expect, test } from "@playwright/test";

test("헤더 로그아웃 상태가 페이지 이동보다 먼저 반영된다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `header_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "헤더 상태 여행자",
      email: `${username}@example.com`,
      password: "header-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.goto("/settings");
  const accountToggle = page.getByRole("button", { name: "계정 메뉴 열기" });
  await expect(accountToggle).toBeVisible();

  // Keep the old document mounted briefly. This verifies the client-side account
  // state itself changes instead of only looking correct after the next page loads.
  await page.route("**/", async (route) => {
    if (route.request().isNavigationRequest()) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }
    await route.continue();
  });

  await accountToggle.click();
  await page.locator(".site-account-popover").getByRole("menuitem", { name: "로그아웃" }).click();
  await expect(page.locator(".site-account-login")).toBeVisible({ timeout: 1_000 });
  await expect(page).toHaveURL(/\/$/);
});

test("로그인 직후 모바일 기록 메뉴가 보호 화면을 다시 로그인 없이 연다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `record_${suffix}`;
  const email = `${username}@example.com`;
  const password = "record-password-42";
  const registerResponse = await page.request.post("/api/auth/register", {
    data: { username, displayName: "기록 메뉴 여행자", email, password },
  });
  expect(registerResponse.status()).toBe(200);
  await page.request.post("/api/auth/logout");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login?next=%2Fdiscover");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await page.getByRole("button", { name: "로그인하고 계속" }).click();
  await expect(page).toHaveURL(/\/discover$/);

  const mobileNavigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(mobileNavigation.getByRole("link", { name: "마이" })).toBeVisible();
  await mobileNavigation.getByRole("link", { name: "기록" }).click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("heading", { name: "최근 활동" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "로그인" })).toHaveCount(0);
});

test("로그인된 사용자가 로그인 주소를 열면 기록 화면으로 돌아간다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `signed_in_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "로그인 유지 여행자",
      email: `${username}@example.com`,
      password: "signed-in-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.goto("/login?next=%2Fstudio%23activity");

  await expect(page).toHaveURL(/\/studio#activity$/);
  await expect(page.getByRole("heading", { name: "최근 활동" })).toBeVisible();
});
