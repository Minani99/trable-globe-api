"use client";

import { useState } from "react";
import { apiMutation } from "@/lib/api/client";
import { COMPANIONS, courseCompanion } from "@/lib/course-day";
import type { CourseDay, TravelDetail } from "@/types";

export function CourseDayEditor({ travel, date, online, onSaved }: {
  travel: TravelDetail; date: string; online: boolean; onSaved: (day: CourseDay) => void;
}) {
  const saved = travel.courseDays?.[date];
  const [companion, setCompanion] = useState(saved?.companion ?? courseCompanion(travel.description));
  const [transport, setTransport] = useState(saved?.transport ?? "");
  const [reflection, setReflection] = useState(saved?.reflection ?? "");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setPending(true);
    setMessage("");
    try {
      const result = await apiMutation<CourseDay>("/api/private/travels/" + travel.id + "/course-days/" + date, "PUT", {
        companion: companion || null, transport: transport || null, reflection: reflection.trim() || null,
      });
      if (!result) throw new Error();
      onSaved(result);
      setMessage("저장했습니다.");
    } catch {
      setMessage("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }
  return <details className="course-day-editor">
    <summary>이날의 동행·이동수단과 한 줄 후기</summary>
    <fieldset disabled={pending}>
      <label>누구와 갔나요?<select aria-label="누구와 갔나요?" value={companion} onChange={event => { setCompanion(event.target.value); setMessage(""); }}>
        <option value="">기본값{courseCompanion(travel.description) && " · " + courseCompanion(travel.description)}</option>
        {COMPANIONS.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>이동수단<select aria-label="이동수단" value={transport} onChange={event => { setTransport(event.target.value); setMessage(""); }}>
        <option value="">선택 안 함</option>
        {["도보", "대중교통", "자차", "자전거", "혼합"].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>다시 간다면<textarea rows={2} maxLength={240} value={reflection} onChange={event => { setReflection(event.target.value); setMessage(""); }}
        placeholder="다시 간다면 어떤 순서로 둘러보고 싶나요?" /></label>
      <small>공개 여행이나 공유 링크에서 이날의 코스와 함께 보여요.</small>
      <button type="button" disabled={!online} onClick={save}>{pending ? "저장 중…" : "코스 정보 저장"}</button>
      <span role="status">{online ? message : "인터넷 연결 후 저장할 수 있어요."}</span>
    </fieldset>
  </details>;
}
