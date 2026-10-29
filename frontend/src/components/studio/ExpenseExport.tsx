"use client";

import { useState } from "react";
import { expenseCsv } from "@/lib/expense-export";
import type { TravelCurrency, TravelExpense } from "@/types";

export function ExpenseExport({ travelId, expenses, currency, disabled }: {
  travelId: number; expenses: TravelExpense[]; currency: TravelCurrency; disabled: boolean;
}) {
  const [message, setMessage] = useState("");

  function download() {
    let url: string | undefined;
    const anchor = document.createElement("a");
    try {
      url = URL.createObjectURL(new Blob([expenseCsv(expenses, currency)], { type: "text/csv;charset=utf-8" }));
      anchor.href = url;
      anchor.download = `travel-${travelId}-expenses.csv`;
      document.body.append(anchor);
      anchor.click();
      setMessage("비용 내역 다운로드를 시작했습니다. 브라우저의 다운로드 목록을 확인해 주세요.");
    } catch {
      setMessage("파일을 만들지 못했습니다. 다시 시도해 주세요.");
    } finally {
      anchor.remove();
      if (url) {
        const downloadUrl = url;
        window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      }
    }
  }

  return <div className="travel-expense-export">
    <button type="button" disabled={disabled || expenses.length === 0} onClick={download}>비용 내역 CSV 다운로드</button>
    <p>저장된 비용 이름·분류·금액·통화·결제 상태를 내보냅니다.</p>
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
