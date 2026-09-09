"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";

function formValue(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || "(입력하지 않음)";
}

export function BetaFeedbackForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [template, setTemplate] = useState("");

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
    const nextTemplate = [
      "[Travel Globe 지인 베타 피드백]",
      `영역: ${formValue(data, "area")}`,
      `하려던 일: ${formValue(data, "intent")}`,
      `실제로 일어난 일: ${formValue(data, "result")}`,
      `기대했던 모습: ${formValue(data, "expected")}`,
      `기기·브라우저: ${formValue(data, "device")}`,
      `요청 번호: ${formValue(data, "requestId")}`,
      `확인 주소: ${window.location.origin}${new URLSearchParams(window.location.search).get("from") || "/feedback"}`,
      `발생 시각: ${new Date().toLocaleString("ko-KR")}`,
    ].join("\n");

    setTemplate(nextTemplate);
    saveDraft(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const shareRequested = !(submitter instanceof HTMLButtonElement) || submitter.value !== "copy";
    try {
      if (shareRequested && navigator.share) {
        await navigator.share({ title: "Travel Globe 베타 피드백", text: nextTemplate });
        showFeedback("공유할 앱을 선택했어요.", "success");
        return;
      }
      await copyTemplate(nextTemplate);
      showFeedback("내용을 복사했어요. 메신저에 붙여넣어 주세요.", "success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      try {
        await copyTemplate(nextTemplate);
        showFeedback("내용을 복사했어요. 메신저에 붙여넣어 주세요.", "success");
      } catch {
        showFeedback("아래 내용을 직접 복사해 주세요.", "error");
      }
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
      onInput={(event) => saveDraft(event.currentTarget)}
    >
      <label>
        <span>어느 화면이었나요?</span>
        <select name="area" defaultValue="여행 계획">
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
        <textarea name="intent" rows={3} placeholder="예: 저장해 둔 일본 여행 계획을 다시 수정하려고 했어요." required />
      </label>
      <label>
        <span>실제로는 어떻게 됐나요?</span>
        <textarea name="result" rows={3} placeholder="예: 수정 버튼을 찾지 못했고 처음 화면으로 돌아갔어요." required />
      </label>
      <label>
        <span>어떻게 되길 기대했나요?</span>
        <textarea name="expected" rows={2} placeholder="예: 최근 계획에서 바로 이어서 작성하고 싶었어요." />
      </label>
      <div className="beta-feedback-form__row">
        <label>
          <span>기기·브라우저</span>
          <input name="device" placeholder="예: 아이폰 15 · Safari" />
        </label>
        <label>
          <span>요청 번호</span>
          <input name="requestId" placeholder="오류에 표시된 경우만" />
        </label>
      </div>
      <p className="beta-feedback-form__safety">
        비밀번호, 인증번호, 여권·예약번호, 결제정보는 적거나 캡처하지 마세요.
      </p>
      <div className="beta-feedback-form__actions">
        <button type="submit" name="action" value="share">메신저로 보내기</button>
        <button type="submit" name="action" value="copy">내용 복사</button>
      </div>
      {template ? (
        <section className="beta-feedback-result" aria-live="polite">
          <div>
            <strong>복사할 내용</strong>
            <button type="button" onClick={copyAgain}>다시 복사</button>
          </div>
          <textarea value={template} readOnly rows={9} aria-label="생성된 피드백 양식" />
          <p>초대받은 카카오톡이나 메신저 대화방에 붙여넣어 보내 주세요.</p>
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
    window.localStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

function saveDraft(form: HTMLFormElement) {
  const data = new FormData(form);
  const draft = Object.fromEntries(
    ["area", "intent", "result", "expected", "device", "requestId"].map((key) => [key, String(data.get(key) ?? "")]),
  ) as FeedbackDraft;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
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
