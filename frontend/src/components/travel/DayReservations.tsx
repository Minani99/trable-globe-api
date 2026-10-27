"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiSessionGet } from "@/lib/api/client";
import type { TravelPlanning, TravelReservation, TravelReservationCategory } from "@/types";

const LABELS: Record<TravelReservationCategory, string> = {
  FLIGHT: "항공", STAY: "숙소", TRANSPORT: "교통", ACTIVITY: "체험", RESTAURANT: "식당", OTHER: "기타",
};
type Result = { key: string; reservations: TravelReservation[] } | { key: string; error: true };

export function DayReservations({ travelId, date, online }: { travelId: number; date: string; online: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${travelId}:${online}:${attempt}`;
  useEffect(() => {
    if (!online) return;
    let active = true;
    void apiSessionGet<TravelPlanning>(`/api/private/travels/${travelId}/planning`)
      .then(planning => { if (active) setResult({ key, reservations: planning.reservations }); })
      .catch(() => { if (active) setResult({ key, error: true }); });
    return () => { active = false; };
  }, [travelId, online, key]);
  const current = result?.key === key ? result : null;
  const reservations = current && "reservations" in current ? current.reservations.filter(item => item.reservationDate === date) : null;
  const loading = online && !current;

  return <section className="day-reservations" aria-label="선택한 날짜 예약" aria-busy={loading}>
    <header><h3>이 날짜의 예약</h3><Link href={`/studio/travels/${travelId}/edit?plan=1#travel-budget`}>예약 관리</Link></header>
    {!online ? <p role="status">예약 정보는 인터넷 연결 후 확인할 수 있어요.</p>
      : loading ? <p role="status">예약을 확인하고 있어요…</p>
      : current && "error" in current ? <p role="status">예약 정보를 불러오지 못했어요. 다시 확인해 주세요.</p>
      : reservations?.length ? <ul>{reservations.map(item => <li key={item.id}>
        <div><small>{LABELS[item.category]}</small><span className={item.confirmed ? "is-confirmed" : undefined}>{item.confirmed ? "예약 확정" : "확인 필요"}</span></div>
        <strong>{item.title}</strong>
        {item.memo ? <p>{item.memo}</p> : null}
      </li>)}</ul> : <p>이 날짜에 등록한 예약이 없어요.</p>}
    {online ? <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{current && "error" in current ? "예약 다시 확인" : "예약 새로고침"}</button> : null}
  </section>;
}
