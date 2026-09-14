import { expect, test, type Page } from "@playwright/test";
import { journeyGroups, nextJourneyAction } from "../src/lib/journey-next-action";
import type { OwnedTravelSummary } from "../src/types";

function summary(id: number, startDate: string, endDate: string, visibility = "PRIVATE") {
  return { travel: { id, startDate, endDate }, visibility, updatedAt: `2026-09-${String(id).padStart(2, "0")}T00:00:00Z` } as OwnedTravelSummary;
}

test("여행 단계는 공개 여부와 무관하게 날짜로 구분하고 여행 중 일정을 우선한다", () => {
  const trips = [summary(1, "2026-09-10", "2026-09-13"), summary(2, "2026-09-20", "2026-09-21"), summary(3, "2026-09-15", "2026-09-16", "PUBLIC"), summary(4, "2026-09-14", "2026-09-14", "PUBLIC")];
  const today = "2026-09-14";
  expect(nextJourneyAction(trips, today)?.trip.travel.id).toBe(4);
  expect(nextJourneyAction(trips, today)?.href).toBe("/studio/travels/4/go?date=2026-09-14");
  expect(nextJourneyAction(trips.slice(0, 3), today)?.trip.travel.id).toBe(3);
  expect(nextJourneyAction(trips.slice(0, 1), today)?.phase).toBe("record");
  expect(journeyGroups(trips, today).records).toHaveLength(0);
  expect(journeyGroups(trips, "2026-09-15").records.map((item) => item.travel.id)).toEqual([4]);
  expect(trips.map((trip) => trip.travel.id)).toEqual([1, 2, 3, 4]);
  expect(nextJourneyAction([], today)).toBeNull();
  expect(nextJourneyAction([summary(5, "2026-09-01", "2026-09-02", "PUBLIC")], today)).toBeNull();
});

test("메인과 내 여행에서 계획·오늘 일정·기록의 다음 행동이 일치한다", async ({ page }, testInfo) => {
  const username = `journey_${Date.now().toString(36)}`;
  expect((await page.request.post("/api/auth/register", { data: {
    username, displayName: "여행 흐름 점검", email: `${username}@example.com`, password: "journey-flow-password-42",
  } })).status()).toBe(200);
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });
  await page.goto("/");
  await expect(page.locator(".landing-primary-cta")).toHaveText(/새 여행 계획/);

  const past = await createTrip(page, "다녀온 여행", offset(today, -3), offset(today, -1));
  await checkAction(page, "여행 기록하기", `/studio/travels/${past}/edit?finish=1`);
  const later = await createTrip(page, "나중에 갈 여행", offset(today, 30), offset(today, 32));
  const upcoming = await createTrip(page, "곧 떠날 여행", offset(today, 5), offset(today, 7));
  await checkAction(page, "이어서 계획하기", `/studio/travels/${upcoming}/edit?plan=1`);
  await page.goto("/studio");
  await expect(page.getByRole("list", { name: "작성 중인 계획" }).locator("li").first()).toContainText("곧 떠날 여행");
  await expect(page.locator(`a[href="/studio/travels/${later}/edit?plan=1"]`)).toBeVisible();
  await page.getByRole("region", { name: "곧 떠날 여행", exact: true }).getByRole("link", { name: /이어서 계획하기/ }).click();
  await expect(page).toHaveURL(new RegExp(`/studio/travels/${upcoming}/edit\\?plan=1$`));

  const active = await createTrip(page, "지금 여행 중인 길고 긴 여행 제목으로 모바일 줄바꿈 확인", offset(today, -1), today, "PUBLIC");
  const todayHref = `/studio/travels/${active}/go?date=${today}`;
  await checkAction(page, "오늘 일정 보기", todayHref);
  await page.goto("/studio");
  const card = page.locator('section[data-phase="travel"]');
  await expect(card.locator('[aria-current="step"]')).toHaveText("여행 중");
  await expect(page.getByRole("heading", { name: "새 여행 계획 만들기" })).toHaveCount(0);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await card.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const action = card.getByRole("link", { name: /오늘 일정 보기/ });
    expect(await action.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.height >= 44 && element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`journey-hub-${width}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await card.getByRole("link", { name: /오늘 일정 보기/ }).click();
  await expect(page).toHaveURL(new RegExp(`/go\\?date=${today}$`));
  await expect(page.getByRole("button", { name: /DAY 2/ })).toHaveAttribute("aria-current", "date");
  const detail = await page.request.get(`/api/private/travels/${past}`);
  expect((await detail.json()).data.visibility).toBe("PRIVATE");
});

async function checkAction(page: Page, label: string, href: string) {
  await page.goto("/");
  await expect(page.locator(".landing-primary-cta")).toHaveText(new RegExp(label));
  await expect(page.locator(".landing-primary-cta")).toHaveAttribute("href", href);
  await expect(page.locator(".landing-secondary-cta")).toHaveText("내 여행 전체 보기");
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.locator(".landing-primary-cta").evaluate((element) => {
    const box = element.getBoundingClientRect();
    return element.scrollWidth <= element.clientWidth + 1 && box.left >= 0 && box.right <= window.innerWidth;
  })).toBe(true);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/studio");
  await expect(page.locator("section[data-phase]").getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", href);
}

function offset(day: string, days: number) { return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10); }

async function createTrip(page: Page, title: string, startDate: string, endDate: string, visibility = "PRIVATE") {
  const response = await page.request.post("/api/private/travels", { data: {
    title, startDate, endDate, visibility, description: "", coverImageUrl: null, photos: [], places: [{
      country: { iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2, longitude: 138.2 },
      city: null, placeName: "도쿄역", latitude: 35.68, longitude: 139.76, visitedAt: startDate, memo: null,
    }],
  } });
  expect(response.status(), await response.text()).toBe(201);
  return (await response.json()).data.id as number;
}
