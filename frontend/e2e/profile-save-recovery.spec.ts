import { expect, test } from "./fixtures";

test("빈 프로필 저장 응답은 기존 사진을 삭제하지 않고 재시도할 수 있다", async ({ page }) => {
  const username = `profile_${Date.now().toString(36)}`;
  expect((await page.request.post("/api/auth/register", { data: {
    username, displayName: "프로필 확인", email: `${username}@example.com`, password: "profile-recovery-password-42",
  } })).ok()).toBe(true);
  const imageUrl = "https://images.example.test/old-profile.png";
  expect((await page.request.patch("/api/private/profile", { data: {
    displayName: "프로필 확인", bio: "기존 소개", profileImageUrl: imageUrl,
  } })).ok()).toBe(true);
  await page.route("https://images.example.test/**", route => route.abort());
  let deletes = 0;
  await page.route("**/api/uploads/object", route => {
    deletes += 1;
    return route.fulfill({ json: { success: true, data: null } });
  });
  let invalidResponse = true;
  await page.route("**/api/private/profile", route => invalidResponse
    ? route.fulfill({ json: { success: true, data: null } })
    : route.continue());
  await page.goto("/settings#profile");
  const profile = page.locator("#profile");
  await profile.getByRole("button", { name: "사진 삭제", exact: true }).click();
  await profile.getByRole("textbox", { name: "표시 이름", exact: true }).fill("수정한 이름");
  await profile.getByRole("button", { name: "프로필 저장", exact: true }).click();
  await expect(profile).toContainText("저장된 프로필을 확인하지 못했습니다");
  await expect(profile).not.toContainText("프로필을 저장했습니다.");
  await expect(profile.getByRole("textbox", { name: "표시 이름", exact: true })).toHaveValue("수정한 이름");
  expect(deletes).toBe(0);
  invalidResponse = false;
  await profile.getByRole("button", { name: "프로필 저장", exact: true }).click();
  await expect(profile.getByText("프로필을 저장했습니다.", { exact: true })).toBeVisible();
  await expect.poll(() => deletes).toBe(1);
});
