import { expect, test } from "@playwright/test";
import { expenseCsv } from "../src/lib/expense-export";

test("CSV preserves Korean text, quotes, multiline names and numeric amounts", () => {
  const csv = expenseCsv([{ id: 1, title: '숙소, "조식"\n포함', category: "STAY", amount: 123.45, paid: true }], "USD");
  expect(csv).toBe('\uFEFF"비용 이름","분류","금액","통화","결제 상태"\r\n"숙소, ""조식""\n포함","숙소",123.45,"USD","결제 완료"\r\n');
});

test("spreadsheet formula prefixes are exported as text", () => {
  for (const title of ["=1+1", "+123", "-123", "@SUM(A1)", "  =1+1", "\t=1+1", "\rtest"]) {
    const csv = expenseCsv([{ id: 1, title, category: "OTHER", amount: 0, paid: false }], "KRW");
    expect(csv).toContain(`"'${title}","기타",0,"KRW","미결제"`);
  }
  expect(expenseCsv([], "KRW").split("\r\n")).toHaveLength(2);
});
