"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { apiMutation } from "@/lib/api/client";
import { COMPANIONS, courseCompanion } from "@/lib/course-day";
import type { CourseDay, TravelDetail } from "@/types";

type Draft = { companion: string; transport: string; reflection: string };
const subscribeToSession = () => () => {};
const noDraft = () => null;

function readDraft(key: string) {
  try { return sessionStorage.getItem(key); } catch { return null; }
}

function parseDraft(raw: string | null): Draft | null {
  if (!raw) return null;
  try {
    const fields = JSON.parse(raw);
    return fields && typeof fields.companion === "string" && typeof fields.transport === "string"
      && typeof fields.reflection === "string" ? fields : null;
  } catch { return null; }
}

export function CourseDayEditor({ travel, date, online, onSaved }: {
  travel: TravelDetail; date: string; online: boolean; onSaved: (day: CourseDay) => void;
}) {
  const saved = travel.courseDays?.[date];
  const editor = useRef<HTMLDetailsElement>(null);
  const editorId = `course-day-${date}`;
  useEffect(() => {
    function openLinkedEditor() {
      if (location.hash !== "#" + editorId || !editor.current) return;
      editor.current.open = true;
      editor.current.querySelector("summary")?.focus({ preventScroll: true });
      editor.current.scrollIntoView({ block: "start" });
    }
    openLinkedEditor();
    window.addEventListener("hashchange", openLinkedEditor);
    return () => window.removeEventListener("hashchange", openLinkedEditor);
  }, [editorId]);
  const draftKey = `course-day-draft:${travel.owner.username}:${travel.id}:${date}`;
  const sessionDraft = useSyncExternalStore(subscribeToSession, () => readDraft(draftKey), noDraft);
  const [edited, setEdited] = useState<Draft | null>(null);
  const [discarded, setDiscarded] = useState<Draft | null>(null);
  const draft = edited ?? parseDraft(sessionDraft);
  const fields = draft ?? {
    companion: saved?.companion ?? "", transport: saved?.transport ?? "", reflection: saved?.reflection ?? "",
  };
  const { companion, transport, reflection } = fields;
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  function update(change: Partial<Draft>) {
    const next = { ...fields, ...change };
    setEdited(next);
    setDiscarded(null);
    setMessage("");
    try { sessionStorage.setItem(draftKey, JSON.stringify(next)); } catch { /* Keep editing in memory. */ }
  }
  function discard() {
    try { sessionStorage.removeItem(draftKey); } catch {
      if (readDraft(draftKey)) {
        setMessage("임시 저장본을 지우지 못했습니다. 다시 시도해 주세요.");
        return;
      }
    }
    setDiscarded(draft);
    setEdited(null);
    setMessage("임시 저장본을 버렸습니다.");
  }
  async function save() {
    setPending(true);
    setMessage("");
    try {
      const result = await apiMutation<CourseDay>("/api/private/travels/" + travel.id + "/course-days/" + date, "PUT", {
        companion: companion || null, transport: transport || null, reflection: reflection.trim() || null,
      });
      if (!result) throw new Error();
      try {
        if (readDraft(draftKey) === JSON.stringify(fields)) sessionStorage.removeItem(draftKey);
      } catch { /* Saving to the server has already succeeded. */ }
      setEdited(null);
      setDiscarded(null);
      onSaved(result);
      setMessage("저장했습니다.");
    } catch {
      setMessage("저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPending(false);
    }
  }
  return <details ref={editor} id={editorId} className="course-day-editor">
    <summary>이날의 동행·이동수단과 한 줄 후기</summary>
    <fieldset disabled={pending}>
      <label>누구와 갔나요?<select aria-label="누구와 갔나요?" value={companion} onChange={event => update({ companion: event.target.value })}>
        <option value="">기본값{courseCompanion(travel.description) && " · " + courseCompanion(travel.description)}</option>
        {COMPANIONS.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>이동수단<select aria-label="이동수단" value={transport} onChange={event => update({ transport: event.target.value })}>
        <option value="">선택 안 함</option>
        {["도보", "대중교통", "자차", "자전거", "혼합"].map(value => <option key={value}>{value}</option>)}
      </select></label>
      <label>다시 간다면<textarea aria-label="다시 간다면" rows={2} maxLength={240} value={reflection} onChange={event => update({ reflection: event.target.value })}
        placeholder="다시 간다면 어떤 순서로 둘러보고 싶나요?" /></label>
      <small>공개 여행이나 공유 링크에서 이날의 코스와 함께 보여요.</small>
      <div className="course-day-actions">
        <button type="button" disabled={!online || !draft} onClick={save}>{pending ? "저장 중…" : "코스 정보 저장"}</button>
        {draft && <button type="button" className="course-day-secondary" onClick={discard}>임시 저장본 버리기</button>}
        {discarded && <button type="button" className="course-day-secondary" onClick={() => update(discarded)}>버리기 취소</button>}
      </div>
      <span role="status">{message || (online ? (sessionDraft && draft ? "이 탭에 임시 저장됨" : "") : "인터넷 연결 후 저장할 수 있어요.")}</span>
    </fieldset>
  </details>;
}
