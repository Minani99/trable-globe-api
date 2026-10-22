import { expect, test } from "./fixtures";

const sectionNames = ["일정은 한곳에.", "다녀온 여행은 기록으로.", "다른 사람들의 여행도 둘러보세요."];

test("메인 소개는 여행 전·후·둘러보기를 각각의 섹션으로 나누고 실제 이동 링크만 제공한다", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const [plan, record, browse] = sectionNames.map((name) => page.getByRole("region", { name, exact: true }));
  await plan.scrollIntoViewIfNeeded();
  for (const [section, heading] of [[plan, sectionNames[0]], [record, sectionNames[1]], [browse, sectionNames[2]]] as const) {
    await expect(section.getByRole("heading")).toHaveText([heading]);
    await expect(section.getByRole("button")).toHaveCount(0);
    expect((await section.boundingBox())!.height).toBeLessThan(750);
  }
  await expect(plan.getByRole("figure")).toHaveCount(1);
  await expect(record.getByRole("figure")).toHaveCount(1);
  await expect(plan.getByRole("link", { name: "여행 계획 만들기" })).toHaveAttribute("href", "/studio/plans/new");
  await expect(record.getByRole("link", { name: "샘플 기록 보기" })).toHaveAttribute("href", "/traveler");
  await expect(browse.getByRole("link", { name: "공개 여행 둘러보기" })).toHaveAttribute("href", "/discover");
  await expect(page.locator(".landing-identity-flow, .landing-journey-flow, .landing-world-proof")).toHaveCount(0);
  // Each section is a separate band that starts below the previous one.
  const tops = await Promise.all([plan, record, browse].map(async (section) => (await section.boundingBox())!.y));
  expect(tops[1]).toBeGreaterThan(tops[0]);
  expect(tops[2]).toBeGreaterThan(tops[1]);
  const typography = await page.locator(".landing-band--plan h2, .landing-band--record h2, .landing-band--browse h2").evaluateAll((headings) => headings.map((heading) => ({
    fontSize: parseFloat(getComputedStyle(heading).fontSize),
    animation: getComputedStyle(heading).animationName,
  })));
  expect(typography).toHaveLength(3);
  typography.forEach(({ fontSize, animation }) => {
    expect(fontSize).toBeLessThanOrEqual(32);
    expect(animation).toBe("none");
  });
  await plan.screenshot({ path: testInfo.outputPath("landing-plan-light.png") });

  const planLink = plan.getByRole("link", { name: "여행 계획 만들기" });
  await planLink.focus();
  await expect(planLink).toBeFocused();
  expect(await planLink.evaluate((link) => getComputedStyle(link).outlineStyle)).toBe("solid");

  await page.getByRole("button", { name: "어두운 화면으로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await record.scrollIntoViewIfNeeded();
  await record.screenshot({ path: testInfo.outputPath("landing-record-dark.png") });
  expect(errors).toEqual([]);
});

test("태블릿에서도 예시와 문구가 넘치지 않는다", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [768, 1024]) {
    await page.setViewportSize({ width, height: 1024 });
    for (const [index, name] of sectionNames.entries()) {
      const section = page.getByRole("region", { name, exact: true });
      await section.scrollIntoViewIfNeeded();
      await expect(section).toBeVisible();
      const layout = await section.evaluate((element) => ({
        viewport: window.innerWidth,
        document: document.documentElement.scrollWidth,
        clipped: [...element.querySelectorAll("figure, h2, p")].some((node) => node.scrollWidth > node.clientWidth + 1),
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
      await section.screenshot({ path: testInfo.outputPath(`landing-section-${index + 1}-${width}.png`) });
    }
  }
});

test("모바일 메인은 지구본을 가리지 않고 하단 탐색을 유지한다", async ({ page }) => {
  await page.goto("/");
  for (const width of [360, 390, 700]) {
    await page.setViewportSize({ width, height: 844 });
    for (const name of sectionNames) {
      await expect(page.getByRole("region", { name, exact: true, includeHidden: true })).toBeHidden();
    }
    const navigation = page.getByRole("navigation", { name: "모바일 주요 메뉴" });
    await expect(navigation).toBeVisible();
    const globe = page.locator(".landing-globe-frame");
    await globe.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const globeBounds = (await globe.boundingBox())!;
    const navigationBounds = (await navigation.boundingBox())!;
    expect(globeBounds.y + globeBounds.height).toBeLessThanOrEqual(navigationBounds.y + 1);
    expect(navigationBounds.y + navigationBounds.height).toBeCloseTo(844, 0);
    const layout = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.width).toBeLessThanOrEqual(layout.viewportWidth + 1);
  }
});
