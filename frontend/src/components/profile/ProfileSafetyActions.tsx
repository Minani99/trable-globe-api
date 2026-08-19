"use client";

import { FormEvent, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError } from "@/lib/api/client";
import { blockMember, reportMember, unblockMember } from "@/lib/api/discovery";
import type { MemberReportReason, MemberSafetyStatus } from "@/types";

const reportReasons: Array<{ value: MemberReportReason; label: string }> = [
  { value: "SPAM", label: "스팸 또는 광고" },
  { value: "HARASSMENT", label: "괴롭힘 또는 위협" },
  { value: "HATE_SPEECH", label: "혐오 표현" },
  { value: "IMPERSONATION", label: "사칭" },
  { value: "INAPPROPRIATE_CONTENT", label: "부적절한 콘텐츠" },
  { value: "OTHER", label: "기타" },
];

export function ProfileSafetyActions({
  username,
  status,
  onStatusChange,
}: {
  username: string;
  status: MemberSafetyStatus;
  onStatusChange: (status: MemberSafetyStatus) => void;
}) {
  const [pending, setPending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleBlock() {
    if (!status.blockedByCurrentMember && !window.confirm(
      `@${username}님을 차단할까요? 서로의 팔로우가 해제되고 검색·추천에 표시되지 않습니다.`,
    )) return;

    setPending(true);
    setError(null);
    try {
      const next = status.blockedByCurrentMember
        ? await unblockMember(username)
        : await blockMember(username);
      if (next) {
        onStatusChange(next);
        showFeedback(next.blockedByCurrentMember ? "사용자를 차단했습니다." : "차단을 해제했습니다.", "success");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "차단 상태를 바꾸지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setPending(true);
    setError(null);
    try {
      const receipt = await reportMember(
        username,
        values.get("reason") as MemberReportReason,
        String(values.get("details") ?? ""),
      );
      if (receipt) {
        form.reset();
        setReportOpen(false);
        showFeedback("신고가 접수됐습니다. 확인 후 필요한 조치를 진행할게요.", "success");
      }
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "신고를 접수하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="profile-safety">
      <div className="profile-safety__links">
        <button type="button" disabled={pending} onClick={() => setReportOpen((open) => !open)}>
          신고
        </button>
        <span aria-hidden="true">·</span>
        <button type="button" disabled={pending} onClick={toggleBlock}>
          {status.blockedByCurrentMember ? "차단 해제" : "차단"}
        </button>
      </div>

      {reportOpen ? (
        <form className="profile-safety__report" onSubmit={submitReport}>
          <label>
            <span>신고 사유</span>
            <select name="reason" defaultValue="SPAM" required>
              {reportReasons.map((reason) => (
                <option key={reason.value} value={reason.value}>{reason.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>추가 설명 <small>선택</small></span>
            <textarea name="details" rows={3} maxLength={500} placeholder="검토에 필요한 내용을 적어 주세요." />
          </label>
          <div>
            <button type="button" onClick={() => setReportOpen(false)}>취소</button>
            <button type="submit" disabled={pending}>{pending ? "접수 중…" : "신고 접수"}</button>
          </div>
        </form>
      ) : null}

      {error ? <small className="profile-safety__error" role="alert">{error}</small> : null}
    </div>
  );
}
