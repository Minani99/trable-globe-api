"use client";

import { FormEvent, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";

function formValue(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim() || "(입력하지 않음)";
}

export function BetaFeedbackForm() {
  const [template, setTemplate] = useState("");

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
      `발생 시각: ${new Date().toLocaleString("ko-KR")}`,
    ].join("\n");

    setTemplate(nextTemplate);
    try {
      await navigator.clipboard.writeText(nextTemplate);
      showFeedback("피드백 양식을 복사했어요. 초대받은 메신저에 붙여넣어 주세요.", "success");
    } catch {
      showFeedback("아래 내용을 직접 복사해 주세요.", "error");
    }
  }

  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(template);
      showFeedback("다시 복사했어요.", "success");
    } catch {
      showFeedback("복사 권한이 없어 아래 내용을 직접 선택해 주세요.", "error");
    }
  }

  return (
    <form className="beta-feedback-form" onSubmit={handleSubmit}>
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
      <button type="submit">피드백 양식 복사</button>
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
