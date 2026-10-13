"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import { showFeedback } from "@/components/common/AppFeedback";
import { Icon } from "@/components/common/Icon";
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

  return (
    <section id="account" className="account-card" aria-labelledby="studio-account-heading">
      <header className="account-card__header">
        <span className="account-card__icon" aria-hidden="true"><Icon name="mail" /></span>
        <div>
          <h2 id="studio-account-heading">로그인 정보</h2>
          <p>로그인과 프로필 주소에 쓰이는 정보입니다.</p>
        </div>
        <span className={`account-chip ${savedMember.emailVerified ? "is-success" : "is-warning"}`}>{savedMember.emailVerified ? "인증됨" : "인증 필요"}</span>
      </header>
      {!savedMember.emailVerified ? (
        <div className="account-callout">
          <Icon name="shield" />
          <div>
            <strong>이메일 인증이 필요해요</strong>
            <p>비밀번호를 잊었을 때 계정을 되찾으려면 인증된 이메일이 필요합니다.</p>
            {verificationStatus ? <small role="status">{verificationStatus}</small> : null}
            {developmentToken ? <Link href={`/verify-email?token=${encodeURIComponent(developmentToken)}`}>개발 환경에서 인증 계속하기 <Icon name="arrow-right" /></Link> : null}
          </div>
          <button type="button" className="account-button is-secondary" onClick={requestVerification} disabled={pending}>{pending ? "보내는 중…" : "인증 메일 다시 받기"}</button>
        </div>
      ) : null}
      <form onSubmit={updateIdentity}>
        <div className="account-card__body account-card__grid">
          <label className="account-field">
            <span className="account-field__label">사용자명</span>
            <span className="account-affix">
              <span aria-hidden="true">@</span>
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
            </span>
            <small id="settings-username-help" className="account-field__help">검색과 프로필 주소에 사용됩니다.</small>
            <small
              id="settings-username-status"
              className={`account-field__status${["available", "current"].includes(usernameAvailability.status) ? " is-ok" : ["invalid", "unavailable"].includes(usernameAvailability.status) ? " is-error" : ""}`}
              aria-live="polite"
            >
              {identityErrors.username || usernameAvailability.message}
            </small>
          </label>
          <label className="account-field">
            <span className="account-field__label">이메일</span>
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
            <small className="account-field__help">변경하면 새 이메일 인증이 필요합니다.</small>
            {identityErrors.email ? <small className="account-field__status is-error">{identityErrors.email}</small> : null}
          </label>
          <label className={`account-field account-field--confirm is-wide${identityChanged ? " is-required" : ""}`}>
            <span className="account-field__label">현재 비밀번호</span>
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
            <small className="account-field__help">{identityChanged ? "변경 내용을 저장하려면 현재 비밀번호를 입력해 주세요." : "사용자명이나 이메일을 바꿀 때 필요합니다."}</small>
            {identityErrors.currentPassword ? <small className="account-field__status is-error">{identityErrors.currentPassword}</small> : null}
          </label>
        </div>
        <footer className="account-card__footer">
          <span aria-live="polite">{identityStatus}</span>
          <button type="submit" className="account-button is-primary" disabled={!identityChanged || !currentPassword || identityPending || usernameBlocked}>
            {identityPending ? "저장 중…" : "로그인 정보 저장"}
          </button>
        </footer>
      </form>
    </section>
  );
}
