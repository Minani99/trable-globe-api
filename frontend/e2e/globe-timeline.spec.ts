import { expect, test } from "@playwright/test";

test("여행 시간축을 따라 개인 지구본이 성장하고 현재로 돌아온다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const controls = page.getByRole("region", { name: "여행 시간 탐색" });
  const range = page.getByLabel("여행 시점 선택");
  await expect(controls).toBeVisible();
  const max = Number(await range.getAttribute("max"));
  expect(max).toBeGreaterThan(0);

  await range.fill("0");
  await expect(controls).toHaveClass(/is-engaged/);
  await expect(page.getByText("그때의 세계", { exact: true })).toBeVisible();
  await expect(page.locator(".globe-memory-spotlight")).toBeVisible();
  const firstMarkerCount = await page.locator(".tg-marker").count();

  await range.fill(String(max));
  await expect.poll(() => page.locator(".tg-marker").count()).toBeGreaterThanOrEqual(firstMarkerCount);

  await controls.getByRole("button", { name: "현재" }).click();
  await expect(controls).not.toHaveClass(/is-engaged/);
  await expect(range).toHaveValue(String(max));

  await controls.getByRole("button", { name: "여행 세계 재생", exact: true }).click();
  await expect(controls.getByRole("button", { name: "여행 세계 재생 일시정지" })).toBeVisible();
  await expect(range).toHaveValue("0");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(controls).toBeVisible();
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});
