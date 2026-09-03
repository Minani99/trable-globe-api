import { expect, test } from "@playwright/test";

test("메인 소개는 두 가지 예시와 실제 이동 링크만 제공한다", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const overview = page.getByRole("region", { name: "계획과 기록" });
  await overview.scrollIntoViewIfNeeded();
  await expect(overview.getByRole("article")).toHaveCount(2);
  await expect(overview.getByRole("figure")).toHaveCount(2);
  await expect(overview.getByRole("button")).toHaveCount(0);
  await expect(overview.getByRole("heading")).toHaveText(["일정은 한곳에.", "다녀온 여행은 기록으로."]);
  await expect(overview.getByRole("link", { name: "여행 계획 만들기" })).toHaveAttribute("href", "/studio/plans/new");
  await expect(overview.getByRole("link", { name: "샘플 기록 보기" })).toHaveAttribute("href", "/traveler");
  await expect(overview.getByRole("link", { name: "공개 여행 둘러보기" })).toHaveAttribute("href", "/discover");
  await expect(page.locator(".landing-identity-flow, .landing-journey-flow, .landing-world-proof")).toHaveCount(0);
  const typography = await overview.locator("h2").evaluateAll((headings) => headings.map((heading) => ({
    fontSize: parseFloat(getComputedStyle(heading).fontSize),
    animation: getComputedStyle(heading).animationName,
  })));
  typography.forEach(({ fontSize, animation }) => {
    expect(fontSize).toBeLessThanOrEqual(32);
    expect(animation).toBe("none");
  });
  expect((await overview.boundingBox())!.height).toBeLessThan(750);
  await overview.screenshot({ path: testInfo.outputPath("landing-overview-light.png") });

  const planLink = overview.getByRole("link", { name: "여행 계획 만들기" });
  await planLink.focus();
  await expect(planLink).toBeFocused();
  expect(await planLink.evaluate((link) => getComputedStyle(link).outlineStyle)).toBe("solid");

  await page.getByRole("button", { name: "어두운 화면으로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await overview.scrollIntoViewIfNeeded();
  await overview.screenshot({ path: testInfo.outputPath("landing-overview-dark.png") });
  expect(errors).toEqual([]);
});

test("태블릿에서도 예시와 문구가 넘치지 않는다", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const overview = page.getByRole("region", { name: "계획과 기록" });
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 1024 });
    await overview.scrollIntoViewIfNeeded();
    await expect(overview).toBeVisible();
    const layout = await overview.evaluate((element) => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      clipped: [...element.querySelectorAll("figure, article, h2, p")].some((node) => node.scrollWidth > node.clientWidth + 1),
      previewBounds: [...element.querySelectorAll("figure")].map((node) => {
        const bounds = node.getBoundingClientRect();
        return { left: bounds.left, right: bounds.right };
      }),
    }));
    expect(layout.document).toBeLessThanOrEqual(layout.viewport + 1);
    expect(layout.clipped).toBe(false);
    layout.previewBounds.forEach((bounds) => {
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(width);
    });
    await overview.screenshot({ path: testInfo.outputPath(`landing-overview-${width}.png`) });
  }
});

test("모바일 메인은 추가 스크롤 없이 지구본에 집중한다", async ({ page }) => {
  await page.goto("/");
  for (const width of [360, 390, 700]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole("region", { name: "계획과 기록", includeHidden: true })).toBeHidden();
    await expect(page.getByRole("navigation", { name: "모바일 주요 메뉴" })).toBeVisible();
    const layout = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.height).toBeLessThanOrEqual(layout.viewportHeight + 1);
    expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  }
});
