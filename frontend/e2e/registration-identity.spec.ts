import { expect, test } from "@playwright/test";

test("샘플 세계를 미리 보고 가입 후 내 세계와 가입 정보를 바로 고친다", async ({ page }) => {
  await page.goto("/");
  const worldScope = page.locator(".landing-world-summary__stats");
  await expect(worldScope).toContainText("국가66", { timeout: 20_000 });
  await expect(worldScope).toContainText("여행45");
  await expect(page.locator(".landing-world-summary__identity")).toContainText("샘플 지구본");

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
  await expect(page.getByRole("button", { name: "계정 만들기" })).toBeDisabled();

  await usernameInput.fill(originalUsername);
  await expect(page.getByText("사용할 수 있는 사용자명입니다.")).toBeVisible({ timeout: 10_000 });
  await page.getByLabel("이메일", { exact: true }).fill(originalEmail);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "계정 만들기" }).click();
  await expect(page).toHaveURL(/\/studio$/, { timeout: 30_000 });

  await page.goto("/");
  await expect(page.locator(".landing-world-summary__stats")).toContainText("국가0", { timeout: 20_000 });
  await expect(page.locator(".landing-world-summary__stats")).toContainText("여행0");
  await expect(page.locator(".landing-world-summary__identity")).toContainText("내 지구본린");

  await page.goto("/settings");
  await page.locator('input[name="username"]').fill(nextUsername);
  await expect(page.getByText("사용할 수 있는 사용자명입니다.")).toBeVisible({ timeout: 10_000 });
  await page.locator('input[name="email"]').fill(nextEmail);
  await page.locator("#account").getByLabel("현재 비밀번호", { exact: false }).fill(password);
  await page.getByRole("button", { name: "로그인 정보 저장" }).click();
  await expect(page.getByText("저장했습니다. 새 이메일을 인증해 주세요.")).toBeVisible({ timeout: 20_000 });

  await page.goto(`/${nextUsername}`);
  await expect(page.getByRole("heading", { name: "린의 여행 세계" })).toBeVisible();
});
