import { expect, test } from "./fixtures";

test("내 여행은 최근 활동을 기다리지 않고 열리고 활동은 펼칠 때만 조회한다", async ({ page }) => {
  const username = `activity_${Date.now().toString(36)}`;
  expect((await page.request.post("/api/auth/register", { data: {
    username, displayName: "빠른 여행 목록", email: `${username}@example.com`, password: "activity-loading-password-42",
  } })).ok()).toBe(true);
  let requests = 0;
  let fail = true;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/private/activity?**", async route => {
    requests += 1;
    await gate;
    if (fail) return route.fulfill({ status: 503, json: { success: false, data: null } });
    return route.continue();
  });
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "내 여행", exact: true })).toBeVisible();
  const activity = page.locator(".studio-activity-disclosure");
  expect(requests).toBe(0);
  try {
    await activity.locator("summary").click();
    await expect.poll(() => requests).toBe(1);
    await expect(activity.getByRole("status")).toContainText("불러오는 중");
    await expect(page.locator("main").getByRole("link", { name: "새 여행 계획", exact: true })).toBeVisible();
  } finally { release(); }
  await expect(activity.getByRole("status")).toContainText("불러오지 못했어요");
  fail = false;
  await activity.getByRole("button", { name: "다시 확인" }).click();
  await expect(activity.getByRole("heading", { name: "최근 활동", exact: true })).toBeVisible();
  expect(requests).toBe(2);
  await activity.locator("summary").click();
  await activity.locator("summary").click();
  await expect(activity.getByRole("heading", { name: "최근 활동", exact: true })).toBeVisible();
  expect(requests).toBe(2);
});
