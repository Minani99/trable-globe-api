import { expect, test } from "@playwright/test";

test("작성 중 세션이 끝나면 내용을 유지한 채 다시 로그인할 수 있다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `expired_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "세션 만료 테스트",
      email: `${username}@example.com`,
      password: "expired-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/settings#profile");
  await page.route("**/api/private/profile", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, data: null, message: "로그인이 필요합니다.", error: { code: "AUTHENTICATION_REQUIRED" } }),
    });
  });

  const bio = page.getByLabel("소개", { exact: true });
  await bio.fill("저장 직전까지 작성한 소개입니다.");
  await page.getByRole("button", { name: "프로필 저장" }).click();

  const notice = page.getByRole("alertdialog", { name: "다시 로그인해 주세요" });
  await expect(notice).toBeVisible();
  await expect(notice).toContainText("여행 작성 화면의 임시 저장 내용은 유지됩니다.");
  await expect(notice.getByRole("link", { name: "다시 로그인" })).toHaveAttribute("href", "/login?next=%2Fsettings%23profile");
  await expect(page.getByRole("navigation", { name: "모바일 주요 메뉴" }).getByRole("link", { name: "로그인" })).toBeVisible();
  await expect(bio).toHaveValue("저장 직전까지 작성한 소개입니다.");
  await notice.getByRole("button", { name: "계속 확인" }).click();
  await expect(notice).toBeHidden();
});
