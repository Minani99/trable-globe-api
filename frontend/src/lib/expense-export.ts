import type { TravelCurrency, TravelExpense, TravelExpenseCategory } from "@/types";

const CATEGORY_LABELS: Record<TravelExpenseCategory, string> = {
  TRANSPORT: "교통", STAY: "숙소", FOOD: "식비", ACTIVITY: "체험", SHOPPING: "쇼핑", OTHER: "기타",
};

function csvText(value: string): string {
  // Quoting alone does not prevent spreadsheet software from evaluating formulas.
  const safe = /^[\s\uFEFF]*[=+\-@]/u.test(value) || /^[\t\r\n]/u.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function expenseCsv(expenses: TravelExpense[], currency: TravelCurrency): string {
  const rows = [
    ["비용 이름", "분류", "금액", "통화", "결제 상태"].map(csvText).join(","),
    ...expenses.map(expense => [
      csvText(expense.title), csvText(CATEGORY_LABELS[expense.category]),
      String(expense.amount), csvText(currency), csvText(expense.paid ? "결제 완료" : "미결제"),
    ].join(",")),
  ];
  return `\uFEFF${rows.join("\r\n")}\r\n`;
}
