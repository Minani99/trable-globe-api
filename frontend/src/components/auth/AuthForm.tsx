"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { setCachedAuthMember } from "@/lib/auth-state";
import { apiMutation, ApiError } from "@/lib/api/client";
import { normalizeUsernameInput, validateUsername } from "@/lib/username";
import { useUsernameAvailability } from "@/lib/useUsernameAvailability";
import type { AuthMember } from "@/types";

export function AuthForm({ mode, nextPath }: { mode: "login" | "register"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [username, setUsername] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isRegister = mode === "register";
  const usernameAvailability = useUsernameAvailability(isRegister ? username : "");
  const usernameBlocked = isRegister && ["empty", "invalid", "checking", "unavailable"].includes(usernameAvailability.status);
  const destination = nextPath ?? "/studio";
  const switchHref = `${isRegister ? "/login" : "/register"}${
    nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""
  }`;

  useEffect(() => {
    router.prefetch(destination);
  }, [destination, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRegister) {
      const usernameError = validateUsername(username);
      if (usernameError || ["empty", "checking", "unavailable"].includes(usernameAvailability.status)) {
        setFieldErrors((current) => ({
          ...current,
          username: usernameError ?? usernameAvailability.message ?? "사용자명을 다시 확인해 주세요.",
        }));
        return;
      }
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    const formData = new FormData(event.currentTarget);
    const body = isRegister
      ? {
          username: username.trim(),
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
        isRegister ? "계정을 만들었습니다." : "로그인했습니다.",
        "success",
      );
      router.replace(destination);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) {
        const nextFieldErrors = Object.fromEntries(caught.fieldErrors.map(({ field, message }) => [field, message]));
        if (caught.message.includes("사용자명") && !nextFieldErrors.username) nextFieldErrors.username = caught.message;
        if (caught.message.includes("이메일") && !nextFieldErrors.email) nextFieldErrors.email = caught.message;
        setFieldErrors(nextFieldErrors);
        setError(Object.keys(nextFieldErrors).length ? "아래 입력 항목을 확인해 주세요." : caught.message);
      } else {
        setError("요청을 처리하지 못했습니다.");
      }
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
              minLength={1}
              maxLength={60}
              pattern="[^<>]*"
              title="꺾쇠괄호 없이 1~60자로 입력해 주세요."
              placeholder="예: 민아의 여행"
              aria-label="보여질 이름"
              aria-describedby={`display-name-help${fieldErrors.displayName ? " display-name-error" : ""}`}
              aria-invalid={Boolean(fieldErrors.displayName)}
              onChange={() => setFieldErrors((current) => ({ ...current, displayName: "" }))}
              required
            />
            <small id="display-name-help">다른 사용자에게 표시되는 이름입니다.</small>
            {fieldErrors.displayName ? <small id="display-name-error" className="field-validation is-error">{fieldErrors.displayName}</small> : null}
          </label>
          <label>
            <span>사용자명</span>
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              inputMode="text"
              spellCheck={false}
              pattern={"[A-Za-z0-9_][A-Za-z0-9._\\-]{1,29}"}
              maxLength={30}
              placeholder="travel_note"
              value={username}
              onChange={(event) => {
                setUsername(normalizeUsernameInput(event.target.value));
                setFieldErrors((current) => ({ ...current, username: "" }));
              }}
              aria-label="사용자명"
              aria-describedby="username-help username-availability username-preview"
              aria-invalid={Boolean(fieldErrors.username) || ["invalid", "unavailable"].includes(usernameAvailability.status)}
              title="영문·숫자·밑줄로 시작하는 2~30자 사용자명을 입력해 주세요."
              required
            />
            <small id="username-help">
              @검색과 프로필 주소에 사용합니다. 영문·숫자·점·밑줄·하이픈 2~30자.
            </small>
            <small
              id="username-availability"
              className={`field-validation${usernameAvailability.status === "available" ? " is-ok" : ["invalid", "unavailable"].includes(usernameAvailability.status) ? " is-error" : ""}`}
              aria-live="polite"
            >
              {fieldErrors.username || usernameAvailability.message}
            </small>
            <small id="username-preview" className="auth-form__username-preview" aria-live="polite">
              프로필 주소 <strong>/{username || "travel_note"}</strong>
            </small>
          </label>
        </div>
      ) : null}

      <label>
        <span>이메일</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
          onChange={() => setFieldErrors((current) => ({ ...current, email: "" }))}
          required
        />
        {fieldErrors.email ? <small className="field-validation is-error">{fieldErrors.email}</small> : null}
      </label>
      <div className="auth-form__field">
        <label htmlFor="auth-password"><span>비밀번호</span></label>
        <span className="auth-password-field">
          <input
            id="auth-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            minLength={isRegister ? 10 : undefined}
            maxLength={72}
            required
          />
          <button
            type="button"
            className="auth-password-field__toggle"
            aria-label={passwordVisible ? "비밀번호 숨기기" : "비밀번호 표시"}
            aria-pressed={passwordVisible}
            aria-controls="auth-password"
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? "숨기기" : "보기"}
          </button>
        </span>
        {isRegister ? <small>10자 이상</small> : null}
      </div>

      {error ? <p className="auth-form__error" role="alert">{error}</p> : null}
      {!isRegister ? <Link className="auth-form__forgot" href="/forgot-password">비밀번호를 잊으셨나요?</Link> : null}
      {isRegister ? (
        <p className="auth-form__legal">
          계정을 만들기 전에 <Link href="/terms" target="_blank">베타 이용 안내</Link>와{" "}
          <Link href="/privacy" target="_blank">개인정보 안내</Link>를 확인해 주세요.
        </p>
      ) : null}
      <button type="submit" disabled={pending || completed || usernameBlocked} aria-busy={pending || completed}>
        <span className="auth-form__button-label">
          {completed
            ? "완료"
            : pending
              ? "확인 중…"
              : isRegister
                ? "계정 만들기"
                : nextPath
                  ? "로그인하고 계속"
                  : "로그인"}
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
