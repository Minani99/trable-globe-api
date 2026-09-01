import { expect, test } from "@playwright/test";

test("전 세계 랜드마크를 미리 보고 가입 오타를 계정 삭제 없이 고친다", async ({ page }) => {
  await page.goto("/");
  const worldScope = page.locator(".landing-globe-stats");
  await expect(worldScope).toContainText("Countries190+");
  await expect(worldScope).toContainText("Landmarks190+");
  await expect(page.getByText("190여 개 나라를 탐색해 보세요")).toBeVisible();

  const suffix = Date.now().toString(36);
  const originalUsername = `_${suffix}`;
  const nextUsername = `fixed_${suffix}`;
  const originalEmail = `${originalUsername}@example.com`;
  const nextEmail = `${nextUsername}@example.com`;
  const password = "identity-password-42";

  await page.goto("/register");
  await page.getByLabel("보여질 이름", { exact: true }).fill("린");
  const usernameInput = page.getByLabel("사용자명", { exact: true });
  await usernameInput.fill("studio");
  await expect(page.getByText("서비스에서 사용하는 이름이라 다른 사용자명을 선택해 주세요.")).toBeVisible();
  await expect(page.getByRole("button", { name: "여행 시작하기" })).toBeDisabled();

  await usernameInput.fill(originalUsername);
  await expect(page.getByText("사용할 수 있는 사용자명입니다.")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("이메일", { exact: true }).fill(originalEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "여행 시작하기" }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 30_000 });

  await page.goto("/settings");
  await page.locator('input[name="username"]').fill(nextUsername);
  await expect(page.getByText("사용할 수 있는 사용자명입니다.")).toBeVisible({ timeout: 10_000 });
  await page.locator('input[name="email"]').fill(nextEmail);
  await page.locator('input[name="currentPassword"]').fill(password);
  await page.getByRole("button", { name: "가입 정보 저장" }).click();
  await expect(page.getByText("가입 정보를 저장하고 새 이메일로 인증 메일을 보냈습니다.")).toBeVisible({ timeout: 20_000 });

  await page.goto(`/${nextUsername}`);
  await expect(page.getByRole("heading", { name: "린의 여행 세계" })).toBeVisible();
});
