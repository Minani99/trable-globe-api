import { expect, test } from "@playwright/test";

test("내 지구본과 마이 프로필이 서로 다른 역할로 열린다", async ({ page }) => {
  const suffix = Date.now().toString(36);
  const username = `split_${suffix}`;
  const displayName = "세계 분리 여행자";
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName,
      email: `${username}@example.com`,
      password: "split-world-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.goto("/globe");
  await expect(page).toHaveURL(/\/globe$/);
  await expect(page.getByRole("heading", { name: "나의 여행 지구본" })).toBeVisible();
  await expect(page.getByRole("link", { name: /전체 프로필과 기록 보기/ })).toHaveAttribute("href", `/${username}`);
  await expect(page.locator("#profile-travel-archive")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileNav = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
  await expect(mobileNav.getByRole("link", { name: "세계" })).toHaveAttribute("aria-current", "page");
  await expect(mobileNav.getByRole("link", { name: "프로필" })).not.toHaveAttribute("aria-current", "page");

  await mobileNav.getByRole("link", { name: "프로필" }).click();
  await expect(page).toHaveURL(new RegExp(`/${username}$`));
  await expect(page.getByRole("heading", { name: `${displayName}의 여행 세계` })).toBeVisible();
  await expect(page.locator("#profile-travel-archive")).toBeVisible();
  await expect(mobileNav.getByRole("link", { name: "프로필" })).toHaveAttribute("aria-current", "page");
  await expect(mobileNav.getByRole("link", { name: "세계" })).not.toHaveAttribute("aria-current", "page");

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
});
