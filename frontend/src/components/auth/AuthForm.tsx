"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiMutation, ApiError } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const body = isRegister
      ? {
          username: formData.get("username"),
          displayName: formData.get("displayName"),
          email: formData.get("email"),
          password: formData.get("password"),
        }
      : { email: formData.get("email"), password: formData.get("password") };

    try {
      const member = await apiMutation<AuthMember>(`/api/auth/${mode}`, "POST", body);
      if (!member) {
        throw new ApiError(500, "계정 정보를 확인할 수 없습니다.");
      }
      router.push("/studio");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "요청을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {isRegister ? (
        <div className="auth-form__row">
          <label>
            <span>이름</span>
            <input name="displayName" autoComplete="name" minLength={2} maxLength={60} required />
          </label>
          <label>
            <span>사용자명</span>
            <input
              name="username"
              autoComplete="username"
              pattern="[A-Za-z0-9][A-Za-z0-9._-]{2,29}"
              placeholder="travel_note"
              required
            />
          </label>
        </div>
      ) : null}

      <label>
        <span>이메일</span>
        <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
      </label>
      <label>
        <span>비밀번호</span>
        <input
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          minLength={isRegister ? 10 : undefined}
          maxLength={72}
          required
        />
        {isRegister ? <small>10자 이상. 비밀번호는 암호화된 해시로만 저장됩니다.</small> : null}
      </label>

      {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
      {!isRegister ? <Link className="auth-form__forgot" href="/forgot-password">비밀번호를 잊으셨나요?</Link> : null}
      <button type="submit" disabled={pending}>
        {pending ? "처리 중…" : isRegister ? "내 지구본 시작하기" : "로그인"}
      </button>

      <p className="auth-form__switch">
        {isRegister ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}{" "}
        <Link href={isRegister ? "/login" : "/register"}>
          {isRegister ? "로그인" : "계정 만들기"}
        </Link>
      </p>
    </form>
  );
}
