"use client";

import { useRef, useState } from "react";

import type { TravelPlace } from "@/types";

export function DayItineraryCopy({ title, date, places }: { title: string; date: string; places: TravelPlace[] }) {
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const preview = useRef<HTMLTextAreaElement>(null);
  const text = [title, `${date} 하루 일정`, "", ...places.map((place, index) =>
    `${index + 1}. ${place.placeName}${place.startTime ? ` · ${place.startTime.slice(0, 5)}` : ""}${place.durationMinutes ? ` · ${place.durationMinutes}분` : ""}`,
  )].join("\n");

  async function copy() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setStatus("");
    try {
      await navigator.clipboard.writeText(text);
      setStatus("하루 일정을 복사했어요. 카카오톡이나 문자에 붙여넣어 보내세요.");
    } catch {
      preview.current?.focus();
      preview.current?.select();
      setStatus("자동 복사를 사용할 수 없어요. 선택된 내용을 길게 눌러 복사해 주세요.");
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return <details className="day-itinerary-copy">
    <summary>하루 일정 복사</summary>
    <div>
      <p>장소·시간·방문 순서를 동행자에게 보내세요. 개인 메모와 사진은 포함하지 않습니다.</p>
      <label>보낼 내용<textarea ref={preview} readOnly value={text} rows={Math.min(9, places.length + 3)} onFocus={event => event.target.select()} /></label>
      <button type="button" disabled={pending} onClick={() => void copy()}>{pending ? "복사 중…" : "일정 내용 복사"}</button>
      <p role="status">{status}</p>
    </div>
  </details>;
}
