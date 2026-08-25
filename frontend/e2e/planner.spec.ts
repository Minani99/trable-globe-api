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
  await page.getByRole("button", { name: "왕복 항공권 결제 완료로 변경" }).click();
  await page.getByText("＋ 예약 추가", { exact: true }).click();
  await page.getByRole("textbox", { name: "새 예약 이름" }).fill("도쿄 호텔 체크인");
  await page.getByRole("button", { name: "추가", exact: true }).last().click();
  await expect(page.getByText("도쿄 호텔 체크인", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "도쿄 호텔 체크인 예약 확정으로 변경" }).click();
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
});
