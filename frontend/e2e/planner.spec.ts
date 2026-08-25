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
  const travelId = Number(page.url().match(/\/travels\/(\d+)\/edit/)?.[1]);
  expect(travelId).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { name: "일본 3일 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "여행 준비 체크리스트" })).toBeVisible();
  await expect(page.locator(".travel-checklist__items li")).toHaveCount(6);
  await page.getByRole("button", { name: "항공·교통편 확인 완료로 변경" }).click();
  await expect(page.locator(".travel-checklist__items li").first()).toHaveClass(/is-complete/);
  await page.getByRole("textbox", { name: "새 준비 항목" }).fill("공항철도 예약");
  await page.getByRole("button", { name: "＋ 추가" }).click();
  await expect(page.getByText("공항철도 예약", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "예산과 예약" })).toBeVisible();
  await page.getByRole("spinbutton", { name: "총예산" }).fill("1500000");
  await page.getByRole("button", { name: "저장", exact: true }).click();
  await expect(page.getByText("₩1,500,000", { exact: true })).toBeVisible();
  await page.getByText("＋ 비용 추가", { exact: true }).click();
  await page.getByRole("textbox", { name: "새 비용 이름" }).fill("왕복 항공권");
  await page.getByRole("spinbutton", { name: "예상 비용" }).fill("450000");
  await page.getByRole("button", { name: "추가", exact: true }).first().click();
  await expect(page.getByText("왕복 항공권", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "왕복 항공권 수정" }).click();
  await page.getByRole("textbox", { name: "비용 이름 수정" }).fill("왕복 항공권·수하물");
  await page.getByRole("spinbutton", { name: "비용 금액 수정" }).fill("480000");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByText("왕복 항공권·수하물", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "왕복 항공권·수하물 결제 완료로 변경" }).click();
  await page.getByText("＋ 예약 추가", { exact: true }).click();
  await page.getByRole("textbox", { name: "새 예약 이름" }).fill("도쿄 호텔 체크인");
  await page.getByRole("button", { name: "추가", exact: true }).last().click();
  await expect(page.getByText("도쿄 호텔 체크인", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "도쿄 호텔 체크인 수정" }).click();
  await page.getByRole("textbox", { name: "예약 이름 수정" }).fill("시부야 호텔 체크인");
  await page.getByRole("textbox", { name: "예약 메모 수정" }).fill("15시 이후 체크인");
  await page.getByRole("button", { name: "변경 저장" }).click();
  await expect(page.getByText("시부야 호텔 체크인", { exact: true })).toBeVisible();
  await expect(page.getByText("15시 이후 체크인", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "시부야 호텔 체크인 예약 확정으로 변경" }).click();
  await expect(page.getByRole("heading", { name: "일차별 일정" })).toBeVisible();
  await expect(page.getByRole("tab", { name: /DAY 1/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByText("0 / 3일", { exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "장소 이름" }).first()).toHaveValue("1일차 · 장소를 골라주세요");
  await page.getByRole("textbox", { name: "장소 이름" }).first().fill("도쿄역");
  await expect(page.getByText("1 / 3일", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "＋ 식사" }).click();
  await expect(page.getByRole("textbox", { name: "장소 이름" })).toHaveCount(2);
  await page.getByRole("tab", { name: /DAY 2/ }).click();
  await expect(page.getByRole("button", { name: "전날 일정 복사" })).toBeVisible();
  await page.getByRole("button", { name: "전날 일정 복사" }).click();
  await expect(page.getByRole("textbox", { name: "장소 이름" })).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "장소 이름" })).toHaveValue("도쿄역");
  await expect(page.getByRole("button", { name: "계획 저장" })).toBeVisible();

  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "다가오는 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "일본 3일 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "최근 활동" })).toBeVisible();

  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  const finishResponse = await page.request.put(`/api/private/travels/${travelId}`, {
    data: {
      title: "다녀온 일본 여행",
      description: "계획대로 걷고 돌아온 여행",
      startDate: today,
      endDate: today,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: [{
        country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.204824, longitude: 138.252924 },
        city: { nameEn: "Tokyo", nameKo: "도쿄", latitude: 35.6762, longitude: 139.6503 },
        placeName: "도쿄역",
        latitude: 35.681236,
        longitude: 139.767125,
        visitedAt: today,
        memo: "실제로 다녀온 첫 장소",
      }],
      photos: [],
    },
  });
  expect(finishResponse.status()).toBe(200);
  await page.evaluate((key) => window.localStorage.removeItem(key), `travel-globe:draft:${username}:${travelId}`);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "기록으로 완성할 여행" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "다녀온 일본 여행" })).toBeVisible();
  await page.getByRole("link", { name: /기록 완성하기/ }).click();
  await expect(page.getByRole("heading", { name: "이 계획을 여행 기록으로 완성하세요." })).toBeVisible();
  await page.getByRole("button", { name: "기록으로 전환 준비" }).click();
  await page.getByRole("button", { name: "기록으로 전환하기" }).click();
  await expect(page).toHaveURL(new RegExp(`/${username}/travel/${travelId}$`), { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "다녀온 일본 여행" })).toBeVisible();
});
