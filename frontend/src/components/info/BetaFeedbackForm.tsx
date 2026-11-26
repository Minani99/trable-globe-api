"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";

function formValue(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || "(입력하지 않음)";
}

export function BetaFeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [template, setTemplate] = useState("");

  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const submission = useRef({ text: "", submissionId: "" });
  const busy = useRef(false);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams(window.location.search);
    const saved = readDraft();
    for (const key of ["area", "intent", "result", "expected", "device", "requestId"] as const) {
      const field = form.elements.namedItem(key);
      if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement)) continue;
      const value = params.get(key) || saved?.[key] || (key === "device" ? deviceSummary() : "");
      if (value) field.value = value;
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const page = new URLSearchParams(window.location.search).get("from")?.split(/[?#]/)[0];
    const safePage = page && ["/studio", "/discover", "/traveler", "/login"].includes(page) ? page : "/feedback";
    const nextTemplate = [
      "[Travel Globe 지인 베타 피드백]",
      `영역: ${formValue(data, "area")}`,
      `하려던 일: ${formValue(data, "intent")}`,
      `실제로 일어난 일: ${formValue(data, "result")}`,
      `기대했던 모습: ${formValue(data, "expected")}`,
      `기기·브라우저: ${formValue(data, "device")}`,
      `요청 번호: ${formValue(data, "requestId")}`,
      `확인 주소: ${window.location.origin}${safePage}`,
    ].join("\n");

    setTemplate(nextTemplate);
    saveDraft(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    if (submitter instanceof HTMLButtonElement && submitter.value === "copy") {
      try {
        await copyTemplate(nextTemplate);
        showFeedback("내용을 복사했어요.", "success");
      } catch {
        showFeedback("아래 내용을 선택해 복사해 주세요.", "error");
      }
      return;
    }
    if (busy.current) return;
    busy.current = true;
    setStatus("sending");
    try {
      if (submission.current.text !== nextTemplate) {
        submission.current = { text: nextTemplate, submissionId: crypto.randomUUID() };
      }
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission.current),
        signal: AbortSignal.timeout(25_000),
      });
      if (!response.ok || !(await response.json()).success) throw new Error("delivery failed");
      form.reset();
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* Storage may be disabled. */ }
      submission.current = { text: "", submissionId: "" };
      setTemplate("");
      setStatus("sent");
    } catch {
      setStatus("failed");
    } finally {
      busy.current = false;
    }
  }

  async function copyAgain() {
    try {
      await copyTemplate(template);
      showFeedback("다시 복사했어요.", "success");
    } catch {
      showFeedback("복사 권한이 없어 아래 내용을 직접 선택해 주세요.", "error");
    }
  }

  return (
    <form
      className="beta-feedback-form"
      ref={formRef}
      onSubmit={handleSubmit}
      onInput={(event) => { saveDraft(event.currentTarget); setStatus("idle"); setTemplate(""); }}
    >
      <label>
        <span>어느 화면이었나요?</span>
        <select disabled={status === "sending"} name="area" defaultValue="여행 계획">
          <option>여행 계획</option>
          <option>장소·지도</option>
          <option>여행 기록</option>
          <option>지구본</option>
          <option>프로필·친구</option>
          <option>로그인·계정</option>
          <option>모바일 화면</option>
          <option>기타</option>
        </select>
      </label>
      <label>
        <span>무엇을 하려 했나요?</span>
        <textarea disabled={status === "sending"} maxLength={1100} name="intent" rows={3} placeholder="예: 저장해 둔 일본 여행 계획을 다시 수정하려고 했어요." />
      </label>
      <label>
        <span>실제로는 어떻게 됐나요?</span>
        <textarea disabled={status === "sending"} maxLength={1100} name="result" rows={3} placeholder="예: 수정 버튼을 찾지 못했고 처음 화면으로 돌아갔어요." required />
      </label>
      <label>
        <span>어떻게 되길 기대했나요?</span>
        <textarea disabled={status === "sending"} maxLength={1100} name="expected" rows={2} placeholder="예: 최근 계획에서 바로 이어서 작성하고 싶었어요." />
      </label>
      <div className="beta-feedback-form__row">
        <label>
          <span>기기·브라우저</span>
          <input disabled={status === "sending"} maxLength={150} name="device" placeholder="예: 아이폰 15 · Safari" />
        </label>
        <label>
          <span>요청 번호</span>
          <input disabled={status === "sending"} maxLength={150} name="requestId" placeholder="오류에 표시된 경우만" />
        </label>
      </div>
      <p className="beta-feedback-form__safety">
        비밀번호, 인증번호, 여권·예약번호, 결제정보는 적거나 캡처하지 마세요.
      </p>
      <div className="beta-feedback-form__actions">
        <button type="submit" name="action" value="send" disabled={status === "sending"}>{status === "sending" ? "보내는 중…" : "오류 제보 보내기"}</button>
        <button type="submit" name="action" value="copy" disabled={status === "sending"}>내용 복사</button>
      </div>
      <p role="status">{status === "sent" ? "제보를 보냈어요. 알려주셔서 감사합니다." :
        status === "failed" ? "전송을 확인하지 못했어요. 다시 시도하거나 메일 앱에서 직접 보내 주세요." : ""}</p>
      {status === "failed" && <a href={"mailto:minhwanpark@naver.com?subject=Travel%20Globe%20베타%20제보&body=" + encodeURIComponent(template)}>메일 앱 열기</a>}
      {template && status !== "sending" ? (
        <section className="beta-feedback-result" aria-live="polite">
          <div>
            <strong>복사할 내용</strong>
            <button type="button" onClick={copyAgain}>다시 복사</button>
          </div>
          <textarea value={template} readOnly rows={9} aria-label="생성된 피드백 양식" />
        </section>
      ) : null}
    </form>
  );
}

const DRAFT_KEY = "travel-globe:beta-feedback-draft";

type FeedbackDraft = Record<"area" | "intent" | "result" | "expected" | "device" | "requestId", string>;

function readDraft(): FeedbackDraft | null {
  try {
    return JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as FeedbackDraft | null;
  } catch {
    return null;
  }
}

function saveDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  const draft = Object.fromEntries(
    ["area", "intent", "result", "expected", "device", "requestId"].map((key) => [key, String(data.get(key) ?? "")]),
  ) as FeedbackDraft;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // Submitting still works when browser storage is unavailable.
  }
}

async function copyTemplate(template: string) {
  await navigator.clipboard.writeText(template);
}

function deviceSummary(): string {
  const userAgent = navigator.userAgent;
  const device = /iPhone/i.test(userAgent)
    ? "iPhone"
    : /iPad/i.test(userAgent)
      ? "iPad"
      : /Android/i.test(userAgent)
        ? "Android"
        : /Windows/i.test(userAgent)
          ? "Windows"
          : /Macintosh/i.test(userAgent)
            ? "Mac"
            : "기타 기기";
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /SamsungBrowser/i.test(userAgent)
      ? "Samsung Internet"
      : /CriOS|Chrome/i.test(userAgent)
        ? "Chrome"
        : /FxiOS|Firefox/i.test(userAgent)
          ? "Firefox"
          : /Safari/i.test(userAgent)
            ? "Safari"
            : "브라우저";
  return `${device} · ${browser}`;
}
