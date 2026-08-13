"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { ApiError, apiMutation } from "@/lib/api/client";
import type { AccountActionResult, AuthMember } from "@/types";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<string | null>(null);
  const [developmentToken, setDevelopmentToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(null);
    const formData = new FormData(event.currentTarget);
    try {
      const result = await apiMutation<AccountActionResult>("/api/auth/password/forgot", "POST", {
        email: formData.get("email"),
      });
      setStatus(result?.message ?? "가입된 이메일이라면 비밀번호 재설정 링크를 보냈습니다.");
      setDevelopmentToken(result?.developmentToken ?? null);
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "재설정 링크를 요청하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label><span>가입한 이메일</span><input name="email" type="email" autoComplete="email" required /></label>
      {status ? <p className="auth-form__notice" role="status">{status}</p> : null}
      {developmentToken ? <Link className="auth-form__dev-link" href={`/reset-password?token=${encodeURIComponent(developmentToken)}`}>개발 환경에서 재설정 계속하기 →</Link> : null}
      <button type="submit" disabled={pending}>{pending ? "요청 중…" : "재설정 링크 받기"}</button>
      <p className="auth-form__switch"><Link href="/login">로그인으로 돌아가기</Link></p>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [pending, setPending] = useState(false);

  async function verify() {
    setPending(true);
    setStatus(null);
    try {
      await apiMutation<AuthMember>("/api/auth/email-verification/confirm", "POST", { token });
      setCompleted(true);
      setStatus("이메일 인증을 마쳤습니다. 이제 계정 복구 기능을 안전하게 사용할 수 있어요.");
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "이메일을 인증하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="auth-form auth-form--action">
      {status ? <p className={completed ? "auth-form__notice" : "auth-form__error"} role="status">{status}</p> : null}
      {completed ? <Link className="auth-form__primary-link" href="/studio">내 기록으로 돌아가기</Link> : <button type="button" onClick={verify} disabled={pending || !token}>{pending ? "확인 중…" : "이메일 인증 완료하기"}</button>}
    </div>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    if (password !== String(formData.get("passwordConfirm") ?? "")) {
      setStatus("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }
    setPending(true);
    setStatus(null);
    try {
      await apiMutation<null>("/api/auth/password/reset", "POST", { token, password });
      router.push("/login?reset=1");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof ApiError ? error.message : "비밀번호를 바꾸지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label><span>새 비밀번호</span><input name="password" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /><small>10자 이상으로 입력해 주세요.</small></label>
      <label><span>새 비밀번호 확인</span><input name="passwordConfirm" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label>
      {status ? <p className="auth-form__error" role="alert">{status}</p> : null}
      <button type="submit" disabled={pending || !token}>{pending ? "저장 중…" : "새 비밀번호 저장"}</button>
    </form>
  );
}
