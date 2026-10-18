"use client";

import { useState } from "react";
import { ApiError, apiMutation, apiSessionGet } from "@/lib/api/client";

export function PlanSharePanel({ travelId, dirty, pendingSave }: { travelId: number; dirty: boolean; pendingSave: boolean }) {
  const [token, setToken] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const endpoint = `/api/private/travels/${travelId}/share`;

  function update(token: string | null) {
    setToken(token);
    setUrl(token ? `${window.location.origin}/share/${token}` : "");
  }
  async function load() {
    if (loaded || pending) return;
    setPending(true);
    try {
      const result = await apiSessionGet<{ token: string | null }>(endpoint);
      update(result.token);
      setLoaded(true);
      setMessage("");
    } catch { setMessage("공유 설정을 불러오지 못했어요. 다시 시도해 주세요."); }
    finally { setPending(false); }
  }
  async function changeSharing(enable: boolean) {
    setPending(true);
    try {
      const result = await apiMutation<{ token: string }>(endpoint, enable ? "POST" : "DELETE");
      update(result?.token ?? null);
      setMessage(enable ? "공유 링크가 준비됐어요. 아래에서 복사해 전달하세요." : "공유를 껐습니다. 이전 링크로는 더 이상 열 수 없어요.");
    } catch (cause) { setMessage(cause instanceof ApiError ? cause.message : "공유 설정을 바꾸지 못했어요."); }
    finally { setPending(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("공유 링크를 복사했습니다."); }
    catch { setMessage("아래 링크를 길게 눌러 직접 복사해 주세요."); }
  }

  return <details className="plan-share-panel" onToggle={(event) => { if (event.currentTarget.open) void load(); }}>
    <summary>일정 공유 <span>링크로 보내기</span></summary>
    <div className="plan-share-panel__body">
      <p>링크를 가진 사람은 제목·날짜·장소·시간·메모를 보고 자신의 계획으로 복사할 수 있어요. 저장한 변경 내용도 링크에 반영됩니다.</p>
      <small>사진·예약·예산은 공유하지 않으며, 공개 프로필에도 추가하지 않습니다. 이미 복사된 계획은 공유를 꺼도 남습니다.</small>
      {dirty ? <p>수정한 내용은 먼저 아래 ‘저장’ 버튼으로 저장해 주세요.</p> : null}
      {loaded && token ? <>
        <label>공유 링크<input readOnly value={url} onFocus={(event) => event.target.select()} /></label>
        <div className="plan-share-panel__actions"><button type="button" onClick={copy} disabled={pending}>링크 복사</button><a href={`/share/${token}`} target="_blank" rel="noreferrer">공유 화면 보기</a><button type="button" onClick={() => void changeSharing(false)} disabled={pending}>공유 끄기</button></div>
      </> : loaded ? <button type="button" disabled={pending || dirty || pendingSave} onClick={() => void changeSharing(true)}>{pending ? "준비 중…" : "일정 공유 링크 만들기"}</button>
        : <button type="button" disabled={pending} onClick={() => void load()}>{pending ? "설정 확인 중…" : "다시 불러오기"}</button>}
      <p role="status">{message}</p>
    </div>
  </details>;
}
