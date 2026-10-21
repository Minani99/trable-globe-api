"use client";

import { useState } from "react";
import { suggestVisitOrder, type LocatedStop } from "@/lib/itinerary-order";
import { Icon } from "@/components/common/Icon";
import { isDirectionsStopLocated } from "@/lib/google-directions";

type Stop = { key: string; placeName: string; latitude: number | null; longitude: number | null; startTime: string };
type Proposal = { signature: string; keys: string[]; beforeKm: number; afterKm: number };

export function VisitOrderSuggestion({ stops, disabled, onApply }: { stops: Stop[]; disabled: boolean; onApply: (keys: string[]) => void }) {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [undo, setUndo] = useState<{ keys: string[]; applied: string[] } | null>(null);
  const [message, setMessage] = useState("");
  const signature = JSON.stringify(stops);
  const valid = proposal?.signature === signature ? proposal : null;
  const canUndo = undo && stops.map((stop) => stop.key).join(",") === undo.applied.join(",");
  function suggest() {
    setMessage("");
    if (stops.length < 4 || stops.length > 30) { setMessage("시작과 도착 장소를 고정하므로 4~30곳의 일정에서 순서를 제안해요."); return; }
    if (!stops.every(isDirectionsStopLocated)) { setMessage("모든 장소의 위치를 먼저 선택해 주세요."); return; }
    const result = suggestVisitOrder(stops as LocatedStop[]);
    if (result.beforeKm - result.afterKm < 0.01) { setProposal(null); setMessage("현재 순서에서 더 짧은 직선거리 동선을 찾지 못했어요."); return; }
    setProposal({ signature, keys: result.ordered.map((stop) => stop.key), beforeKm: result.beforeKm, afterKm: result.afterKm });
  }
  return <section className="visit-order" aria-label="방문 순서 정리">
    <div className="visit-order__heading"><div><strong>방문 순서 정리</strong><p>시작·도착은 유지하고 중간 장소의 동선을 비교해요.</p></div><button type="button" disabled={disabled} onClick={suggest}><Icon name="route" />순서 제안</button></div>
    {valid ? <div className="visit-order__proposal">
      <p>직선거리 합계 {valid.beforeKm.toFixed(1)}km → {valid.afterKm.toFixed(1)}km</p>
      <small>도로·교통·영업시간을 반영하지 않은 제안입니다. 지정한 시간과 예약은 그대로 유지되니 적용 전 확인하세요.</small>
      <ol>{valid.keys.map((key, index) => <li key={key}>{index + 1}. {stops.find((stop) => stop.key === key)?.placeName}</li>)}</ol>
      <div><button type="button" disabled={disabled} onClick={() => { setUndo({ keys: stops.map((stop) => stop.key), applied: valid.keys }); onApply(valid.keys); setProposal(null); setMessage("제안한 순서를 적용했어요. 계획을 저장하면 서버에 반영됩니다."); }}>이 순서 적용</button><button type="button" onClick={() => setProposal(null)}>취소</button></div>
    </div> : null}
    {message ? <p role="status">{message}</p> : null}
    {canUndo ? <button type="button" disabled={disabled} onClick={() => { onApply(undo.keys); setUndo(null); setMessage("이전 방문 순서로 되돌렸어요."); }}>이전 순서로 되돌리기</button> : null}
  </section>;
}
