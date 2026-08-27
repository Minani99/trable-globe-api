"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { setCachedAuthMember } from "@/lib/auth-state";
import { apiMutation, ApiError } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [username, setUsername] = useState("");
  const isRegister = mode === "register";
  const destination = nextPath ?? "/studio";
  const switchHref = `${isRegister ? "/login" : "/register"}${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;

  useEffect(() => {
    router.prefetch(destination);
  }, [destination, router]);

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
      setCachedAuthMember(member);
      setCompleted(true);
      showFeedback(
        isRegister
          ? `${member.displayName}님의 첫 여행을 준비할 공간이 생겼어요.`
          : `${member.displayName}님, 다시 만나 반가워요.`,
        "success",
      );
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "요청을 처리하지 못했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" method="post" onSubmit={handleSubmit}>
      {isRegister ? (
        <div className="auth-form__identity-fields">
          <label>
            <span>보여질 이름</span>
            <input
              name="displayName"
              autoComplete="name"
              minLength={2}
              maxLength={60}
              placeholder="예: 민아의 여행"
              aria-label="보여질 이름"
              aria-describedby="display-name-help"
              required
            />
            <small id="display-name-help">프로필과 여행 기록에 공개되는 이름이에요. 가입 후 언제든 바꿀 수 있어요.</small>
          </label>
          <label>
            <span>사용자명</span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              inputMode="text"
              spellCheck={false}
              pattern={"[A-Za-z0-9][A-Za-z0-9._\\-]{2,29}"}
              maxLength={30}
              placeholder="travel_note"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              aria-label="사용자명"
              aria-describedby="username-help username-preview"
              title="영문 또는 숫자로 시작하는 3~30자 사용자명을 입력해 주세요."
              required
            />
            <small id="username-help">
              프로필 주소와 @검색에 쓰이는 고유 ID예요. 영문 또는 숫자로 시작해 3~30자,
              영문·숫자·점(.)·밑줄(_)·하이픈(-)만 사용할 수 있으며 가입 후에는 바꿀 수 없어요.
            </small>
            <small id="username-preview" className="auth-form__username-preview" aria-live="polite">
              프로필 주소 <strong>/{username || "travel_note"}</strong>
            </small>
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
      {isRegister ? (
        <p className="auth-form__legal">
          계정을 만들기 전에 <Link href="/terms" target="_blank">베타 이용 안내</Link>와{" "}
          <Link href="/privacy" target="_blank">개인정보 안내</Link>를 확인해 주세요.
        </p>
      ) : null}
      <button type="submit" disabled={pending || completed} aria-busy={pending || completed}>
        <span className="auth-form__button-label">
          {completed ? "완료 · 이동 중" : pending ? "안전하게 확인 중…" : isRegister ? "여행 시작하기" : "로그인"}
        </span>
        {(pending || completed) ? <span className={`action-spinner${completed ? " is-complete" : ""}`} aria-hidden="true">{completed ? "✓" : ""}</span> : null}
      </button>

      <p className="auth-form__switch">
        {isRegister ? "이미 계정이 있나요?" : "아직 계정이 없나요?"}{" "}
        <Link href={switchHref}>
          {isRegister ? "로그인" : "계정 만들기"}
        </Link>
      </p>
    </form>
  );
}
