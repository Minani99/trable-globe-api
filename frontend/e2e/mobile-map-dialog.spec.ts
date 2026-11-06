import { expect, test } from "./fixtures";

for (const viewport of [{ width: 320, height: 568 }, { width: 740, height: 360 }, { width: 844, height: 390 }]) {
  test(`위치 조정 창의 지도와 확정 버튼이 ${viewport.width}x${viewport.height}에서 잘리지 않는다`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const username = `mapfit_${viewport.width}_${Date.now().toString(36)}`;
    expect((await page.request.post("/api/auth/register", { data: { username, displayName: "지도 여행자", email: `${username}@example.com`, password: "map-fit-test-only-42" } })).status()).toBe(200);
    await page.goto("/studio/travels/new");
    await page.getByRole("tab", { name: "일정", exact: true }).click();
    await page.getByRole("button", { name: /장소를 추가하세요.*편집/ }).click();
    await page.getByRole("button", { name: /지도에서 직접 찾기/ }).click();
    const dialog = page.getByRole("dialog", { name: "지도에서 위치 조정" });
    await expect(dialog).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("map-dialog.png") });
    for (const name of ["지도 닫기", "이 위치로 확정"]) {
      const button = dialog.getByRole("button", { name, exact: true });
      const box = (await button.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await button.click({ trial: true, timeout: 5000 });
    }
    const map = (await dialog.locator(".place-map-dialog__canvas").boundingBox())!;
    const footer = (await dialog.locator("footer").boundingBox())!;
    expect(map.height).toBeGreaterThan(80);
    expect(map.y + map.height).toBeLessThanOrEqual(footer.y + 1);
    await dialog.getByRole("button", { name: "지도 닫기" }).click();
    await expect(dialog).toHaveCount(0);
  });
}
