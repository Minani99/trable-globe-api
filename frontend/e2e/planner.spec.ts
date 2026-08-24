import { expect, test } from "@playwright/test";

test("몇 번의 선택으로 여행 계획을 만들고 일차별 일정으로 이어간다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `planner_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "계획하는 여행자",
      email: `${username}@example.com`,
      password: "planner-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.goto("/studio/plans/new");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("heading", { name: /빈 페이지 없이/ })).toBeVisible();
  await page.getByRole("button", { name: "일본", exact: true }).click();
  await page.getByRole("button", { name: "2박 3일" }).click();
  await page.getByRole("button", { name: "혼자" }).click();
  await page.getByRole("button", { name: "문화" }).click();
  await expect(page.getByRole("button", { name: "계획 만들기", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "계획 만들기", exact: true }).click();

  await expect(page).toHaveURL(/\/studio\/travels\/\d+\/edit\?plan=1$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "일본 3일 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "일차별 일정" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "장소 이름" }).first()).toHaveValue("1일차 · 장소를 골라주세요");
  await expect(page.getByRole("button", { name: "계획 저장" })).toBeVisible();

  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "다가오는 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "일본 3일 여행" })).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
});
