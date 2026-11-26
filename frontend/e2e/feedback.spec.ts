import { expect, test } from "./fixtures";

test("베타 피드백은 오류 맥락과 기기를 채우고 메일 전송을 재시도할 수 있다", async ({ page }) => {
  const submissions: { text: string; submissionId: string }[] = [];
  await page.route("**/api/feedback", async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ status: submissions.length === 1 ? 503 : 200, json: { success: submissions.length > 1 } });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/feedback?area=%EC%9E%A5%EC%86%8C%C2%B7%EC%A7%80%EB%8F%84&intent=%EC%A7%80%EB%8F%84%EB%A5%BC+%EC%97%B4%EB%A0%A4%EA%B3%A0+%ED%96%88%EC%96%B4%EC%9A%94&requestId=req-123&from=%2Fstudio");

  await expect(page.getByRole("combobox", { name: "어느 화면이었나요?" })).toHaveValue("장소·지도");
  await expect(page.getByRole("textbox", { name: "무엇을 하려 했나요?" })).toHaveValue("지도를 열려고 했어요");
  await expect(page.getByRole("textbox", { name: "요청 번호" })).toHaveValue("req-123");
  await expect(page.getByRole("textbox", { name: "기기·브라우저" })).not.toHaveValue("");

  await page.getByRole("textbox", { name: "실제로는 어떻게 됐나요?" }).fill("지도가 비어 있었어요.");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "실제로는 어떻게 됐나요?" })).toHaveValue("지도가 비어 있었어요.");
  await page.getByRole("button", { name: "오류 제보 보내기" }).click();
  await expect(page.getByRole("link", { name: "메일 앱 열기" })).toHaveAttribute("href", /^mailto:minhwanpark@naver.com/);
  await page.getByRole("button", { name: "내용 복사" }).click();
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain("지도가 비어 있었어요.");
  await page.getByRole("button", { name: "오류 제보 보내기" }).click();
  await expect(page.getByText("제보를 보냈어요. 알려주셔서 감사합니다.")).toBeVisible();
  expect(submissions).toHaveLength(2);
  expect(submissions[1]).toEqual(submissions[0]);
  expect(submissions[0].text).toContain("요청 번호: req-123");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "실제로는 어떻게 됐나요?" })).toHaveValue("");

  const layout = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
});
