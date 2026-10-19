"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { Icon } from "@/components/common/Icon";
import { ApiError, apiMutation } from "@/lib/api/client";
import { setCachedAuthMember } from "@/lib/auth-state";
import type { AuthMember } from "@/types";

export function AccountDeletion({ member }: { member: AuthMember }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (String(formData.get("usernameConfirm") ?? "") !== member.username) {
      setStatus(`확인을 위해 ${member.username}을 정확히 입력해 주세요.`);
      return;
    }
    if (!window.confirm("계정과 모든 여행 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setPending(true);
    setStatus(null);
    try {
      await apiMutation<null>("/api/auth/account", "DELETE", { password: formData.get("password") });
      setCachedAuthMember(null);
      showFeedback("계정과 여행 기록을 삭제했습니다.", "success");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "계정을 삭제하지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <section id="danger" className="account-card is-danger" aria-labelledby="settings-danger-heading">
      <header className="account-card__header">
        <span className="account-card__icon" aria-hidden="true"><Icon name="trash" /></span>
        <div>
          <h2 id="settings-danger-heading">계정 삭제</h2>
          <p>계정과 모든 여행·사진·메모가 영구 삭제되며 되돌릴 수 없습니다.</p>
        </div>
        <button type="button" className="account-button is-danger-outline" aria-expanded={open} aria-controls="account-delete-form" onClick={() => setOpen((current) => !current)}>
          {open ? "취소" : "계정 삭제"}
        </button>
      </header>
      {open ? (
        <form id="account-delete-form" className="account-card__body account-card__grid" onSubmit={deleteAccount}>
          <label className="account-field">
            <span className="account-field__label">현재 비밀번호</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <label className="account-field">
            <span className="account-field__label">확인을 위해 <b>{member.username}</b> 입력</span>
            <input name="usernameConfirm" autoComplete="off" required />
          </label>
          <div className="account-card__footer is-wide">
            <span role="alert">{status}</span>
            <button type="submit" className="account-button is-danger" disabled={pending}>{pending ? "삭제 중…" : "내 계정 영구 삭제"}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
