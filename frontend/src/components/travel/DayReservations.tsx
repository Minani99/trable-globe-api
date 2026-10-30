"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { apiSessionGet } from "@/lib/api/client";
import type { TravelPlanning, TravelReservation, TravelReservationCategory } from "@/types";

const LABELS: Record<TravelReservationCategory, string> = {
  FLIGHT: "항공", STAY: "숙소", TRANSPORT: "교통", ACTIVITY: "체험", RESTAURANT: "식당", OTHER: "기타",
};
type Result = { key: string; reservations: TravelReservation[] } | { key: string; error: true };

type ReservationProps = { travelId: number; date: string; online: boolean };

export function DayReservations(props: ReservationProps) {
  // Reconnection must start fresh rather than display the previous online result.
  return <ReservationPanel key={`${props.travelId}:${props.online}`} {...props} />;
}

function ReservationPanel({ travelId, date, online }: ReservationProps) {
  const [attempt, setAttempt] = useState(0);
  const [scope, setScope] = useState<"day" | "trip">("day");
  const [unconfirmedOnly, setUnconfirmedOnly] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const key = `${travelId}:${online}:${attempt}`;
  useEffect(() => {
    if (!online) return;
    let active = true;
    const controller = new AbortController();
    void apiSessionGet<TravelPlanning>(`/api/private/travels/${travelId}/planning`, { signal: controller.signal })
      .then(planning => { if (active) setResult({ key, reservations: planning.reservations }); })
      .catch(() => { if (active) setResult({ key, error: true }); });
    return () => { active = false; controller.abort(); };
  }, [travelId, online, key]);
  const current = result?.key === key ? result : null;
  const allReservations = current && "reservations" in current ? current.reservations : null;
  const dayReservations = allReservations?.filter(item => item.reservationDate === date);
  const scopedReservations = scope === "trip" ? allReservations : dayReservations;
  const unconfirmedCount = scopedReservations?.filter(item => !item.confirmed).length ?? 0;
  const reservations = unconfirmedOnly ? scopedReservations?.filter(item => !item.confirmed) : scopedReservations;
  const loading = online && !current;

  return <section className="day-reservations" aria-label="선택한 날짜 예약" aria-busy={loading}>
    <header><h3>{scope === "trip" ? "여행 전체 예약" : "이 날짜의 예약"}</h3><Link href={`/studio/travels/${travelId}/edit?plan=1#travel-budget`}>예약 관리</Link></header>
    {online && allReservations ? <div className="day-reservations__scope" role="group" aria-label="예약 보기 범위">
      <button type="button" aria-pressed={scope === "day"} onClick={() => setScope("day")}>이 날짜 {dayReservations?.length}</button>
      <button type="button" aria-pressed={scope === "trip"} onClick={() => setScope("trip")}>여행 전체 {allReservations.length}</button>
    </div> : null}
    {online && allReservations ? <label className="day-reservations__filter">
      <input type="checkbox" checked={unconfirmedOnly} onChange={event => setUnconfirmedOnly(event.target.checked)} />
      <span>확인 필요한 예약만 보기 ({unconfirmedCount})</span>
    </label> : null}
    {!online ? <p role="status">예약 정보는 인터넷 연결 후 확인할 수 있어요.</p>
      : loading ? <p role="status">예약을 확인하고 있어요…</p>
      : current && "error" in current ? <p role="status">예약 정보를 불러오지 못했어요. 다시 확인해 주세요.</p>
      : reservations?.length ? <ul>{reservations.map(item => <li key={item.id}>
        <div><small>{LABELS[item.category]}</small><span className={item.confirmed ? "is-confirmed" : undefined}>{item.confirmed ? "예약 확정" : "확인 필요"}</span></div>
        <strong>{item.title}</strong>
        {scope === "trip" ? <time dateTime={item.reservationDate}>이용 날짜 {item.reservationDate}</time> : null}
        {item.memo ? <p>{item.memo}</p> : null}
      </li>)}</ul> : <p role="status">{unconfirmedOnly && scopedReservations?.length
        ? "이 범위의 예약은 모두 확정되어 있어요. 전체 목록은 필터를 해제해 확인하세요."
        : scope === "trip" ? "여행에 등록한 예약이 없어요." : "이 날짜에 등록한 예약이 없어요."}</p>}
    {online ? <button type="button" disabled={loading} onClick={() => setAttempt(value => value + 1)}>{current && "error" in current ? "예약 다시 확인" : "예약 새로고침"}</button> : null}
  </section>;
}
