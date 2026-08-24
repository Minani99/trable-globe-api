import { expect, test } from "@playwright/test";

test("회원가입부터 프로필 완성, 첫 여행 공개와 공유까지 이어진다", async ({ page }) => {
  page.on("pageerror", (error) => console.error(`[browser page] ${error.message}`));
  page.on("requestfailed", (request) => {
    console.error(`[browser request] ${request.url()} · ${request.failure()?.errorText ?? "failed"}`);
  });
  const suffix = Date.now().toString(36);
  const username = `e2e_${suffix}`;
  const email = `${username}@example.com`;

  await page.goto("/register?next=%2Fstudio%2Ftravels%2Fnew%3Fcountry%3DJP");
  await waitForInteractivePage(page);
  await page.getByLabel("이름", { exact: true }).fill("첫 여행자");
  await page.getByLabel("사용자명", { exact: true }).fill(username);
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.locator('input[name="password"]').fill("journey-password-42");
  await page.getByRole("button", { name: "여행 시작하기" }).click();

  await expect(page).toHaveURL(/\/studio\/travels\/new\?country=JP$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "지난 여행 기록하기" })).toBeVisible();
  await expect(page.locator(".travel-editor select").first()).toHaveValue("JP");

  await page.goto("/settings#profile");
  await waitForInteractivePage(page);
  await page.getByLabel("이름", { exact: true }).fill("도쿄 산책가");
  await page.getByLabel("소개", { exact: true }).fill("낯선 도시를 천천히 걷고 기록합니다.");
  await page.getByRole("button", { name: "변경사항 저장" }).click();
  await expect(page.getByText("프로필을 저장했습니다.", { exact: true })).toBeVisible();

  const createResponse = await page.request.post("/api/private/travels", {
    data: {
      title: "도쿄에서 시작한 첫 여행",
      description: "지구본에서 고른 나라로 이어진 첫 기록",
      startDate: "2026-08-01",
      endDate: "2026-08-02",
      coverImageUrl: null,
      visibility: "PUBLIC",
      places: [{
        country: {
          iso2Code: "JP",
          iso3Code: "JPN",
          nameEn: "Japan",
          nameKo: "일본",
          latitude: 36.204824,
          longitude: 138.252924,
        },
        city: {
          nameEn: "Tokyo",
          nameKo: "도쿄",
          latitude: 35.6762,
          longitude: 139.6503,
        },
        placeName: "도쿄역",
        latitude: 35.681236,
        longitude: 139.767125,
        visitedAt: "2026-08-01",
        memo: "첫 번째 핀",
      }],
      photos: [],
    },
  });
  expect(createResponse.status()).toBe(201);

  await page.goto(`/${username}`);
  await expect(page.getByRole("heading", { name: "도쿄 산책가의 여행 세계" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "도쿄에서 시작한 첫 여행", level: 3 })).toBeVisible();
  await page.getByRole("button", { name: "지구본 공유" }).click();
  await expect(page.getByText("링크를 복사했습니다.", { exact: true })).toBeVisible();
});

async function waitForInteractivePage(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  // The HTML can be visible a fraction before React attaches delegated form handlers.
  await page.waitForTimeout(250);
}
