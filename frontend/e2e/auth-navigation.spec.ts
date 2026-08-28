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
