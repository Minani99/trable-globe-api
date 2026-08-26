import { expect, test } from "@playwright/test";

test("여행 시간축을 따라 개인 지구본이 성장하고 현재로 돌아온다", async ({ page }) => {
  // The CI browser renders the WebGL globe in software. Keep this journey's
  // budget separate from the faster DOM-only tests so the final collapsed
  // spotlight assertion is not cut off by the suite-wide 120s default.
  test.setTimeout(process.env.CI ? 180_000 : 60_000);

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const controls = page.getByRole("region", { name: "여행 시간 탐색" });
  const range = page.getByLabel("여행 시점 선택");
  await expect(controls).toBeVisible();
  await expect(controls).toHaveClass(/is-collapsed/);
  await controls.getByRole("button", { name: "타임라인 펼치기" }).click();
  await expect(controls).toHaveClass(/is-expanded/);
  const max = Number(await range.getAttribute("max"));
  expect(max).toBeGreaterThan(0);

  await range.fill("0");
  await expect(controls).toHaveClass(/is-engaged/);
  await expect(controls.getByText("그때의 세계", { exact: true }).first()).toBeVisible();
  await expect(page.locator(".globe-memory-spotlight")).toHaveCount(0);
  const firstMarkerCount = await page.locator(".tg-marker").count();

  await range.fill(String(max));
  await expect.poll(() => page.locator(".tg-marker").count()).toBeGreaterThanOrEqual(firstMarkerCount);

  await controls.getByRole("button", { name: "현재" }).click();
  await expect(controls).not.toHaveClass(/is-engaged/);
  await expect(range).toHaveValue(String(max));

  await controls.getByRole("button", { name: "여행 세계 재생", exact: true }).click();
  const pauseButton = controls.getByRole("button", { name: "여행 세계 재생 일시정지" });
  await expect(pauseButton).toBeVisible();
  // Playback restarts at zero and can advance while a loaded CI worker is still
  // evaluating the assertion. It only needs to have left the final moment.
  expect(Number(await range.inputValue())).toBeLessThan(4);
  await pauseButton.click();
  await expect(controls.getByRole("button", { name: "여행 세계 재생", exact: true })).toBeVisible();

  await controls.getByRole("button", { name: "타임라인 접기" }).click();
  await expect(controls).toHaveClass(/is-collapsed/);
  await expect(page.locator(".globe-memory-spotlight")).toBeVisible();

  expect(pageErrors).toEqual([]);
});

test("프로필 정보와 모바일 타임라인을 작은 도크에서 펼쳐 본다", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/traveler");
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "샘플 여행자의 여행 세계" })).toBeVisible();

  const viewSwitch = page.getByRole("navigation", { name: "여행 세계 보기 방식" });
  await viewSwitch.getByRole("button", { name: "목록" }).click();
  await expect(page.getByRole("region", { name: "나라와 여행 목록" })).toBeVisible();
  await expect(page.locator(".profile-globe-card canvas")).toHaveCount(0);
  await viewSwitch.getByRole("button", { name: "지구본" }).click();
  await expect(page.locator(".profile-globe-card canvas")).toBeVisible({ timeout: 30_000 });

  const countryIndex = page.getByRole("navigation", { name: "방문한 국가 목록" });
  await countryIndex.getByRole("button", { name: /일본/ }).click();
  const countryDetail = page.getByRole("complementary", { name: "일본 여행 요약" });
  await expect(countryDetail).toBeVisible();
  expect(await countryDetail.evaluate((element) => element.getBoundingClientRect().height)).toBeLessThan(205);
  await countryDetail.getByRole("button", { name: "국가 선택 해제" }).click();

  const controls = page.getByRole("region", { name: "여행 시간 탐색" });
  const profileDock = page.getByRole("region", { name: "여행자 정보" });
  const profileDetails = profileDock.locator(".profile-globe-dock__details");
  await expect(profileDetails).toHaveAttribute("hidden", "");
  await profileDock.getByRole("button", { name: "프로필 정보 펼치기" }).click();
  await expect(profileDetails).not.toHaveAttribute("hidden", "");
  await profileDock.getByRole("button", { name: "프로필 정보 접기" }).click();
  await expect(profileDetails).toHaveAttribute("hidden", "");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(controls).toBeVisible();
  const compactControlsHeight = await controls.evaluate((element) => element.getBoundingClientRect().height);
  expect(compactControlsHeight).toBeLessThan(76);
  const layout = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth + 1);
  expect(pageErrors).toEqual([]);
});
