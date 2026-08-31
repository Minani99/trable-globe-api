import { expect, test } from "@playwright/test";

test("공개 여행을 Journey로 읽고 모바일에서 일정과 사진을 가로 탐색한다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler/travel/1");
  await expect(page.getByRole("heading", { name: "Taipei, again." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "경로와 하루의 흐름" })).toBeVisible();
  await expect(page.locator(".travel-itinerary__list")).toContainText("DAY 01");
  await expect(page.locator(".travel-gallery li")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "이 Journey가 샘플 여행자님의 세계에 남았습니다." })).toBeVisible();
  await expect(page.getByRole("link", { name: /로그인하고 이 Journey로 계획 만들기/ })).toBeVisible();
  await expect(page.locator(".shared-itinerary-save__note")).toContainText("사진과 개인 기록은 포함하지 않습니다");
  await expect(page.getByRole("button", { name: "Journey 공유" })).toBeVisible();
  await expect(page.locator("meta[property='og:type']")).toHaveAttribute("content", "article");
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", /\/traveler\/travel\/1$/);

  await page.getByRole("button", { name: "Journey 공유" }).click();
  await expect(page.locator(".journey-share__status")).toContainText("Journey 링크를 복사했습니다");
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("/traveler/travel/1");

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await page.evaluate(() => {
    const itinerary = document.querySelector<HTMLElement>(".travel-itinerary__list");
    const gallery = document.querySelector<HTMLElement>(".travel-gallery");
    return {
      viewportWidth: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      itineraryScrollable: Boolean(itinerary && itinerary.scrollWidth > itinerary.clientWidth),
      galleryScrollable: Boolean(gallery && gallery.scrollWidth > gallery.clientWidth),
    };
  });
  expect(mobileLayout.documentWidth).toBeLessThanOrEqual(mobileLayout.viewportWidth + 1);
  expect(mobileLayout.itineraryScrollable).toBeTruthy();
  expect(mobileLayout.galleryScrollable).toBeTruthy();
  expect(pageErrors).toEqual([]);
});
