import { expect, test } from "@playwright/test";

test("설치 가능한 앱 정보와 개인정보를 저장하지 않는 오프라인 셸을 제공한다", async ({ page }, testInfo) => {
  const manifestResponse = await page.request.get("/manifest.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  expect(await manifestResponse.json()).toMatchObject({
    name: "Travel Globe",
    short_name: "Travel Globe",
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/icon-192.png", sizes: "192x192", type: "image/png" }),
      expect.objectContaining({ src: "/icon-512.png", sizes: "512x512", type: "image/png" }),
    ]),
  });

  const serviceWorkerResponse = await page.request.get("/sw.js");
  expect(serviceWorkerResponse.status()).toBe(200);
  const serviceWorker = await serviceWorkerResponse.text();
  expect(serviceWorker).toContain('url.pathname.startsWith("/api/")');
  expect(serviceWorker).toContain('caches.match("/offline")');
  expect(serviceWorker).toContain('"/offline/trip"');

  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "인터넷 연결을 확인해 주세요" })).toBeVisible();
  await expect(page.getByRole("link", { name: "저장된 일정" })).toHaveAttribute("href", "/offline/trip");
  const layout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
  await page.screenshot({ path: testInfo.outputPath("offline-mobile.png"), fullPage: true });
});

test("저장된 오늘 일정을 네트워크 없이 현장 화면으로 연다", async ({ page }, testInfo) => {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  await page.addInitScript(({ currentDate }) => {
    Object.defineProperty(window.navigator, "onLine", { configurable: true, get: () => false });
    const username = "offline_user";
    const travel = {
      id: 901,
      title: "서울 주말 여행",
      description: null,
      startDate: currentDate,
      endDate: currentDate,
      durationDays: 1,
      coverImageUrl: null,
      visibility: "PRIVATE",
      owner: { username, displayName: "오프라인 여행자", profileImageUrl: null },
      countries: [{ iso2Code: "KR", iso3Code: "KOR", nameEn: "South Korea", nameKo: "대한민국", latitude: 36.5, longitude: 127.8 }],
      places: [{
        id: 902,
        placeName: "서울숲",
        country: { iso2Code: "KR", iso3Code: "KOR", nameEn: "South Korea", nameKo: "대한민국", latitude: 36.5, longitude: 127.8 },
        city: { id: 1, nameEn: "Seoul", nameKo: "서울", latitude: 37.5665, longitude: 126.978 },
        latitude: 37.5444,
        longitude: 127.0374,
        visitedAt: currentDate,
        startTime: "10:00",
        durationMinutes: 90,
        memo: "산책 후 점심",
        completedAt: null,
        sortOrder: 0,
      }],
      photos: [],
      previousTravel: null,
      nextTravel: null,
    };
    localStorage.setItem("travel-globe:trip-active-user:v1", username);
    localStorage.setItem(`travel-globe:trip-index:v1:${username}`, "[901]");
    localStorage.setItem(`travel-globe:trip-cache:v1:${username}:901`, JSON.stringify({ savedAt: new Date().toISOString(), travel }));
  }, { currentDate: today });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/offline/trip");
  await expect(page.getByRole("heading", { name: "오늘 일정" })).toBeVisible();
  await expect(page.getByRole("list", { name: "서울 주말 여행 오늘 일정" }).getByText("서울숲", { exact: true })).toBeVisible();
  await expect(page.getByText("오프라인 모드", { exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveCSS("overflow-x", "scroll");
  await page.screenshot({ path: testInfo.outputPath("offline-trip-mobile.png"), fullPage: true });
});

test("여행 화면에서 홈 화면 설치 안내를 실행하고 닫을 수 있다", async ({ page }, testInfo) => {
  const suffix = Date.now().toString(36);
  const username = `pwa_${suffix}`;
  const registerResponse = await page.request.post("/api/auth/register", {
    data: {
      username,
      displayName: "설치 테스트",
      email: `${username}@example.com`,
      password: "pwa-password-42",
    },
  });
  expect(registerResponse.status()).toBe(200);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/studio");
  const install = page.getByLabel("Travel Globe 앱 설치");
  await expect.poll(async () => {
    await page.evaluate(() => {
      localStorage.removeItem("travel-globe:pwa-install-dismissed");
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(event, {
        prompt: { value: async () => { (window as typeof window & { pwaPrompted?: boolean }).pwaPrompted = true; } },
        userChoice: { value: Promise.resolve({ outcome: "accepted", platform: "web" }) },
      });
      window.dispatchEvent(event);
    });
    return install.count();
  }).toBe(1);
  await expect(install).toBeVisible();
  await expect(install.getByText("홈 화면에서 바로 열기")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("install-prompt-mobile.png"), fullPage: true });
  await install.getByRole("button", { name: "설치", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean((window as typeof window & { pwaPrompted?: boolean }).pwaPrompted))).toBe(true);
  await expect(install).toBeHidden();
});
