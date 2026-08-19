"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { showFeedback } from "@/components/common/AppFeedback";
import { setCachedAuthMember } from "@/lib/auth-state";
import type { AccountActionResult, AuthMember } from "@/types";

export function AccountSettings({ member }: { member: AuthMember }) {
  const router = useRouter();
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);

  async function requestVerification() {
    setPending(true);
    setVerificationStatus(null);
    try {
      const result = await apiMutation<AccountActionResult>("/api/auth/email-verification", "POST");
      setVerificationStatus(result?.message ?? "인증 메일을 보냈습니다.");
      setDevelopmentToken(result?.developmentToken ?? null);
    } catch (error) {
      setVerificationStatus(error instanceof ApiError ? error.message : "인증 메일을 보내지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (String(formData.get("usernameConfirm") ?? "") !== member.username) {
      setDeleteStatus(`확인을 위해 ${member.username}을 정확히 입력해 주세요.`);
      return;
    }
    if (!window.confirm("계정과 모든 여행 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) return;
    setPending(true);
    setDeleteStatus(null);
    try {
      await apiMutation<null>("/api/auth/account", "DELETE", { password: formData.get("password") });
      setCachedAuthMember(null);
      showFeedback("계정과 여행 기록을 삭제했습니다.", "success");
      router.replace("/");
      router.refresh();
    } catch (error) {
      setDeleteStatus(error instanceof ApiError ? error.message : "계정을 삭제하지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <section id="account" className="studio-account" aria-labelledby="studio-account-heading">
      <div className="studio-account__heading">
        <div><p className="eyebrow">Account</p><h2 id="studio-account-heading">계정</h2></div>
        <span className={member.emailVerified ? "is-verified" : "is-pending"}>{member.emailVerified ? "인증됨" : "인증 필요"}</span>
      </div>
      <div className="studio-account__email"><span>로그인 이메일</span><strong>{member.email}</strong></div>
      {!member.emailVerified ? (
        <div className="studio-account__verification">
          <p>이메일을 인증하면 비밀번호를 잊어도 계정을 안전하게 되찾을 수 있어요.</p>
          <button type="button" onClick={requestVerification} disabled={pending}>{pending ? "보내는 중…" : "인증 메일 다시 받기"}</button>
          {verificationStatus ? <small role="status">{verificationStatus}</small> : null}
          {developmentToken ? <Link href={`/verify-email?token=${encodeURIComponent(developmentToken)}`}>개발 환경에서 인증 계속하기 →</Link> : null}
        </div>
      ) : <p className="studio-account__safe">계정 복구를 위한 이메일 인증이 완료되었습니다.</p>}
      <div className="studio-account__links"><Link href="/forgot-password">비밀번호 재설정</Link><button type="button" onClick={() => setDeleteOpen((current) => !current)}>계정 삭제</button></div>
      {deleteOpen ? (
        <form className="studio-account__delete" onSubmit={deleteAccount}>
          <strong>계정과 모든 여행을 영구 삭제합니다.</strong>
          <label><span>현재 비밀번호</span><input name="password" type="password" autoComplete="current-password" required /></label>
          <label><span>확인을 위해 <b>{member.username}</b> 입력</span><input name="usernameConfirm" autoComplete="off" required /></label>
          {deleteStatus ? <small role="alert">{deleteStatus}</small> : null}
          <button type="submit" disabled={pending}>{pending ? "삭제 중…" : "내 계정 영구 삭제"}</button>
        </form>
      ) : null}
    </section>
  );
}
