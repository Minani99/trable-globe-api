"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { showFeedback } from "@/components/common/AppFeedback";
import { setCachedAuthMember } from "@/lib/auth-state";
import { normalizeUsernameInput, validateUsername } from "@/lib/username";
import { useUsernameAvailability } from "@/lib/useUsernameAvailability";
import type { AccountActionResult, AuthMember } from "@/types";

export function AccountSettings({ member }: { member: AuthMember }) {
  const router = useRouter();
  const [savedMember, setSavedMember] = useState(member);
  const [username, setUsername] = useState(member.username);
  const [email, setEmail] = useState(member.email);
  const [currentPassword, setCurrentPassword] = useState("");
  const [identityStatus, setIdentityStatus] = useState<string | null>(null);
  const [identityErrors, setIdentityErrors] = useState<Record<string, string>>({});
  const [identityPending, setIdentityPending] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);
  const usernameAvailability = useUsernameAvailability(username, savedMember.username);
  const identityChanged = username.trim().toLowerCase() !== savedMember.username
    || email.trim().toLowerCase() !== savedMember.email;
  const usernameBlocked = username.trim().toLowerCase() !== savedMember.username
    && ["empty", "invalid", "checking", "unavailable"].includes(usernameAvailability.status);

  async function updateIdentity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const usernameError = validateUsername(username);
    if (usernameError) {
      setIdentityErrors({ username: usernameError });
      return;
    }
    if (!identityChanged) return;

    setIdentityPending(true);
    setIdentityStatus(null);
    setIdentityErrors({});
    const emailChanged = email.trim().toLowerCase() !== savedMember.email;
    try {
      const result = await apiMutation<AuthMember>("/api/auth/account", "PATCH", {
        username: username.trim(),
        email: email.trim(),
        currentPassword,
      });
      if (!result) throw new ApiError(500, "변경된 계정 정보를 확인할 수 없습니다.");
      setSavedMember(result);
      setCachedAuthMember(result);
      setUsername(result.username);
      setEmail(result.email);
      setCurrentPassword("");
      setIdentityStatus(emailChanged
        ? "저장했습니다. 새 이메일을 인증해 주세요."
        : "로그인 정보를 저장했습니다.");
      showFeedback("로그인 정보를 저장했습니다.", "success");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError) {
        const nextErrors = Object.fromEntries(error.fieldErrors.map(({ field, message }) => [field, message]));
        if (error.message.includes("사용자명") && !nextErrors.username) nextErrors.username = error.message;
        if (error.message.includes("이메일") && !nextErrors.email) nextErrors.email = error.message;
        if (error.status === 401) nextErrors.currentPassword = "현재 비밀번호가 맞지 않습니다.";
        setIdentityErrors(nextErrors);
        setIdentityStatus(Object.keys(nextErrors).length ? "입력한 정보를 다시 확인해 주세요." : error.message);
      } else {
        setIdentityStatus("로그인 정보를 저장하지 못했습니다.");
      }
    } finally {
      setIdentityPending(false);
    }
  }

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
    if (String(formData.get("usernameConfirm") ?? "") !== savedMember.username) {
      setDeleteStatus(`확인을 위해 ${savedMember.username}을 정확히 입력해 주세요.`);
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
    <section id="account" className="studio-account settings-card" aria-labelledby="studio-account-heading">
      <div className="studio-account__heading">
        <div>
          <h2 id="studio-account-heading">로그인 정보</h2>
          <p>사용자명과 이메일을 변경합니다.</p>
        </div>
        <span className={savedMember.emailVerified ? "is-verified" : "is-pending"}>{savedMember.emailVerified ? "인증됨" : "인증 필요"}</span>
      </div>
      <form className="studio-account__identity" onSubmit={updateIdentity}>
        <label>
          <span>사용자명</span>
          <input
            name="username"
            value={username}
            onChange={(event) => {
              setUsername(normalizeUsernameInput(event.target.value));
              setIdentityErrors((current) => ({ ...current, username: "" }));
            }}
            pattern="[A-Za-z0-9_][A-Za-z0-9._\-]{1,29}"
            maxLength={30}
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            aria-describedby="settings-username-help settings-username-status"
            aria-invalid={Boolean(identityErrors.username) || ["invalid", "unavailable"].includes(usernameAvailability.status)}
            required
          />
          <small id="settings-username-help">@검색과 프로필 주소에 사용됩니다.</small>
          <small
            id="settings-username-status"
            className={`field-validation${["available", "current"].includes(usernameAvailability.status) ? " is-ok" : ["invalid", "unavailable"].includes(usernameAvailability.status) ? " is-error" : ""}`}
            aria-live="polite"
          >
            {identityErrors.username || usernameAvailability.message}
          </small>
        </label>
        <label>
          <span>이메일</span>
          <input
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setIdentityErrors((current) => ({ ...current, email: "" }));
            }}
            autoComplete="email"
            aria-invalid={Boolean(identityErrors.email)}
            required
          />
          <small>변경하면 새 이메일 인증이 필요합니다.</small>
          {identityErrors.email ? <small className="field-validation is-error">{identityErrors.email}</small> : null}
        </label>
        <label>
          <span>현재 비밀번호</span>
          <input
            name="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(event) => {
              setCurrentPassword(event.target.value);
              setIdentityErrors((current) => ({ ...current, currentPassword: "" }));
            }}
            autoComplete="current-password"
            aria-invalid={Boolean(identityErrors.currentPassword)}
            required={identityChanged}
          />
          <small>변경 내용을 저장할 때 필요합니다.</small>
          {identityErrors.currentPassword ? <small className="field-validation is-error">{identityErrors.currentPassword}</small> : null}
        </label>
        <div className="studio-account__identity-actions">
          <span aria-live="polite">{identityStatus}</span>
          <button type="submit" disabled={!identityChanged || !currentPassword || identityPending || usernameBlocked}>
            {identityPending ? "저장 중…" : "로그인 정보 저장"}
          </button>
        </div>
      </form>
      {!savedMember.emailVerified ? (
        <div className="studio-account__verification">
          <p>계정 복구를 위해 이메일 인증이 필요합니다.</p>
          <button type="button" onClick={requestVerification} disabled={pending}>{pending ? "보내는 중…" : "인증 메일 다시 받기"}</button>
          {verificationStatus ? <small role="status">{verificationStatus}</small> : null}
          {developmentToken ? <Link href={`/verify-email?token=${encodeURIComponent(developmentToken)}`}>개발 환경에서 인증 계속하기 →</Link> : null}
        </div>
      ) : null}
      <div className="studio-account__links"><button type="button" onClick={() => setDeleteOpen((current) => !current)}>계정 삭제</button></div>
      {deleteOpen ? (
        <form className="studio-account__delete" onSubmit={deleteAccount}>
          <strong>계정과 모든 여행을 영구 삭제합니다.</strong>
          <label><span>현재 비밀번호</span><input name="password" type="password" autoComplete="current-password" required /></label>
          <label><span>확인을 위해 <b>{savedMember.username}</b> 입력</span><input name="usernameConfirm" autoComplete="off" required /></label>
          {deleteStatus ? <small role="alert">{deleteStatus}</small> : null}
          <button type="submit" disabled={pending}>{pending ? "삭제 중…" : "내 계정 영구 삭제"}</button>
        </form>
      ) : null}
    </section>
  );
}
