"use client";

import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import type {
  TravelCurrency,
  TravelExpense,
  TravelExpenseCategory,
  TravelPlanning,
  TravelReservation,
  TravelReservationCategory,
} from "@/types";

const EXPENSE_CATEGORIES: Array<{ value: TravelExpenseCategory; label: string }> = [
  { value: "TRANSPORT", label: "교통" },
  { value: "STAY", label: "숙소" },
  { value: "FOOD", label: "식비" },
  { value: "ACTIVITY", label: "체험" },
  { value: "SHOPPING", label: "쇼핑" },
  { value: "OTHER", label: "기타" },
];
const RESERVATION_CATEGORIES: Array<{ value: TravelReservationCategory; label: string }> = [
  { value: "FLIGHT", label: "항공" },
  { value: "STAY", label: "숙소" },
  { value: "TRANSPORT", label: "교통" },
  { value: "ACTIVITY", label: "체험" },
  { value: "RESTAURANT", label: "식당" },
  { value: "OTHER", label: "기타" },
];
const CURRENCIES: TravelCurrency[] = ["KRW", "USD", "JPY", "EUR"];

export function TravelPlanningBoard({
  travelId,
  startDate,
  initialPlanning,
}: {
  travelId: number;
  startDate: string;
  initialPlanning: TravelPlanning;
}) {
  const [planning, setPlanning] = useState(initialPlanning);
  const [budget, setBudget] = useState(String(initialPlanning.targetAmount || ""));
  const [currency, setCurrency] = useState<TravelCurrency>(initialPlanning.currency);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const basePath = `/api/private/travels/${travelId}/planning`;
  const progress = planning.targetAmount > 0
    ? Math.min(100, Math.round((planning.estimatedAmount / planning.targetAmount) * 100))
    : 0;

  async function mutate(path: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setPending(true);
    setError(null);
    try {
      const next = await apiMutation<TravelPlanning>(path, method, body);
      if (!next) throw new ApiError(500, "업데이트된 여행 준비 정보를 확인할 수 없습니다.");
      setPlanning(next);
      setBudget(String(next.targetAmount || ""));
      setCurrency(next.currency);
      return true;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "예산과 예약 정보를 저장하지 못했습니다.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function saveBudget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(budget);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("총예산을 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    await mutate(`${basePath}/budget`, "PATCH", { targetAmount: amount, currency });
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const amount = Number(data.get("amount"));
    if (!Number.isFinite(amount) || amount < 0) {
      setError("예상 비용을 0 이상의 숫자로 입력해 주세요.");
      return;
    }
    const saved = await mutate(`${basePath}/expenses`, "POST", {
      title: String(data.get("title") ?? ""),
      category: String(data.get("category")),
      amount,
      paid: false,
    });
    if (saved) form.reset();
  }

  async function toggleExpense(expense: TravelExpense) {
    await mutate(`${basePath}/expenses/${expense.id}`, "PATCH", { ...expense, paid: !expense.paid });
  }

  async function addReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const saved = await mutate(`${basePath}/reservations`, "POST", {
      title: String(data.get("title") ?? ""),
      category: String(data.get("category")),
      reservationDate: String(data.get("reservationDate") ?? startDate),
      memo: String(data.get("memo") ?? ""),
      confirmed: false,
    });
    if (saved) form.reset();
  }

  async function toggleReservation(reservation: TravelReservation) {
    await mutate(`${basePath}/reservations/${reservation.id}`, "PATCH", {
      ...reservation,
      confirmed: !reservation.confirmed,
    });
  }

  return (
    <section className="travel-planning-board" aria-labelledby="travel-planning-heading">
      <header>
        <div>
          <p className="eyebrow">Budget & bookings</p>
          <h2 id="travel-planning-heading">예산과 예약</h2>
          <p>흩어진 결제 내역과 예약 일정을 여행 하나에 모아보세요.</p>
        </div>
        <form className="travel-budget-form" onSubmit={saveBudget}>
          <label><span>총예산</span><input name="budget" type="number" min="0" step="0.01" value={budget} onChange={(event) => setBudget(event.target.value)} placeholder="예: 1500000" /></label>
          <label><span>통화</span><select value={currency} onChange={(event) => setCurrency(event.target.value as TravelCurrency)}>{CURRENCIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="submit" disabled={pending}>저장</button>
        </form>
      </header>

      <div className="travel-budget-summary">
        <BudgetMetric label="예상 비용" amount={planning.estimatedAmount} currency={planning.currency} />
        <BudgetMetric label="결제 완료" amount={planning.paidAmount} currency={planning.currency} />
        <BudgetMetric label={planning.remainingAmount < 0 ? "예산 초과" : "남은 예산"} amount={Math.abs(planning.remainingAmount)} currency={planning.currency} danger={planning.remainingAmount < 0} />
        <div className="travel-budget-summary__progress" aria-label={`총예산의 ${progress}% 사용 예정`}><span><i style={{ width: `${progress}%` }} /></span><small>{planning.targetAmount > 0 ? `${progress}% 사용 예정` : "총예산을 입력해 보세요"}</small></div>
      </div>

      <div className="travel-planning-grid">
        <PlanningPanel title="예상 비용" count={planning.expenses.length} description="결제 전 비용도 먼저 적어두세요.">
          {planning.expenses.length ? <ul className="travel-expense-list">{planning.expenses.map((expense) => (
            <li key={expense.id} className={expense.paid ? "is-complete" : undefined}>
              <button type="button" className="travel-plan-toggle" disabled={pending} onClick={() => toggleExpense(expense)} aria-label={`${expense.title} ${expense.paid ? "미결제로 변경" : "결제 완료로 변경"}`}><span aria-hidden="true">{expense.paid ? "✓" : ""}</span></button>
              <div><small>{categoryLabel(EXPENSE_CATEGORIES, expense.category)}</small><strong>{expense.title}</strong></div>
              <b>{formatMoney(expense.amount, planning.currency)}</b>
              <button type="button" className="travel-plan-delete" disabled={pending} onClick={() => mutate(`${basePath}/expenses/${expense.id}`, "DELETE")} aria-label={`${expense.title} 삭제`}>×</button>
            </li>
          ))}</ul> : <p className="travel-plan-empty">항공권이나 숙소처럼 큰 비용부터 추가해 보세요.</p>}
          <details className="travel-plan-composer"><summary>＋ 비용 추가</summary><form onSubmit={addExpense}>
            <input name="title" aria-label="새 비용 이름" placeholder="예: 왕복 항공권" maxLength={120} required />
            <input name="amount" aria-label="예상 비용" type="number" min="0" step="0.01" placeholder="금액" required />
            <select name="category" aria-label="비용 분류">{EXPENSE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <button type="submit" disabled={pending}>추가</button>
          </form></details>
        </PlanningPanel>

        <PlanningPanel title="예약 일정" count={planning.reservations.length} description="확정된 예약은 체크해 두세요.">
          {planning.reservations.length ? <ul className="travel-reservation-list">{planning.reservations.map((reservation) => (
            <li key={reservation.id} className={reservation.confirmed ? "is-complete" : undefined}>
              <button type="button" className="travel-plan-toggle" disabled={pending} onClick={() => toggleReservation(reservation)} aria-label={`${reservation.title} ${reservation.confirmed ? "미확정으로 변경" : "예약 확정으로 변경"}`}><span aria-hidden="true">{reservation.confirmed ? "✓" : ""}</span></button>
              <div><small>{formatShortDate(reservation.reservationDate)} · {categoryLabel(RESERVATION_CATEGORIES, reservation.category)}</small><strong>{reservation.title}</strong>{reservation.memo ? <p>{reservation.memo}</p> : null}</div>
              <button type="button" className="travel-plan-delete" disabled={pending} onClick={() => mutate(`${basePath}/reservations/${reservation.id}`, "DELETE")} aria-label={`${reservation.title} 삭제`}>×</button>
            </li>
          ))}</ul> : <p className="travel-plan-empty">항공·숙소 예약 날짜를 먼저 모아보세요.</p>}
          <details className="travel-plan-composer"><summary>＋ 예약 추가</summary><form onSubmit={addReservation}>
            <input name="title" aria-label="새 예약 이름" placeholder="예: 시부야 호텔 체크인" maxLength={120} required />
            <input name="reservationDate" aria-label="예약 이용 날짜" type="date" defaultValue={startDate} required />
            <select name="category" aria-label="예약 분류">{RESERVATION_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <input name="memo" aria-label="예약 메모" placeholder="시간이나 준비물 (선택)" maxLength={500} />
            <button type="submit" disabled={pending}>추가</button>
          </form></details>
        </PlanningPanel>
      </div>
      {error ? <p className="travel-planning-board__error" role="alert">{error}</p> : null}
    </section>
  );
}

function PlanningPanel({ title, count, description, children }: { title: string; count: number; description: string; children: React.ReactNode }) {
  return <article className="travel-planning-panel"><header><div><h3>{title}</h3><p>{description}</p></div><span>{count}</span></header>{children}</article>;
}

function BudgetMetric({ label, amount, currency, danger = false }: { label: string; amount: number; currency: TravelCurrency; danger?: boolean }) {
  return <div className={danger ? "is-danger" : undefined}><small>{label}</small><strong>{formatMoney(amount, currency)}</strong></div>;
}

function formatMoney(amount: number, currency: TravelCurrency): string {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency, maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2 }).format(amount);
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}

function categoryLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T): string {
  return options.find((item) => item.value === value)?.label ?? "기타";
}
