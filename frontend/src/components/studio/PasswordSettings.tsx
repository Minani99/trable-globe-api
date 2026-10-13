"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { Icon } from "@/components/common/Icon";
import { ApiError, apiMutation } from "@/lib/api/client";

export function PasswordSettings() {
  const [status, setStatus] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

    if (newPassword !== passwordConfirm) {
      setErrors({ passwordConfirm: "새 비밀번호가 일치하지 않습니다." });
      setStatus("입력 내용을 확인해 주세요.");
      return;
    }

    setPending(true);
    setStatus(null);
    setErrors({});
    try {
      await apiMutation<null>("/api/auth/password", "PATCH", { currentPassword, newPassword });
      form.reset();
      setStatus("비밀번호를 변경했습니다.");
      showFeedback("비밀번호를 변경했습니다.", "success");
    } catch (error) {
      if (error instanceof ApiError) {
        const nextErrors = Object.fromEntries(error.fieldErrors.map(({ field, message }) => [field, message]));
        if (error.status === 401) nextErrors.currentPassword = "현재 비밀번호가 맞지 않습니다.";
        setErrors(nextErrors);
        setStatus(Object.keys(nextErrors).length ? "입력 내용을 확인해 주세요." : error.message);
      } else {
        setStatus("비밀번호를 변경하지 못했습니다.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="security" className="account-card" aria-labelledby="settings-security-heading">
      <header className="account-card__header">
        <span className="account-card__icon" aria-hidden="true"><Icon name="lock" /></span>
        <div>
          <h2 id="settings-security-heading">비밀번호</h2>
          <p>변경하면 다른 기기에서는 로그아웃됩니다.</p>
        </div>
      </header>
      <form onSubmit={changePassword}>
        <div className="account-card__body account-card__grid">
          <label className="account-field is-wide">
            <span className="account-field__label">현재 비밀번호</span>
            <input
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.currentPassword)}
              required
            />
            {errors.currentPassword ? <small className="account-field__status is-error">{errors.currentPassword}</small> : null}
          </label>
          <label className="account-field">
            <span className="account-field__label">새 비밀번호</span>
            <input
              name="newPassword"
              type="password"
              aria-label="새 비밀번호"
              aria-describedby="settings-new-password-help"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.newPassword)}
              required
            />
            <small id="settings-new-password-help" className={errors.newPassword ? "account-field__status is-error" : "account-field__help"}>{errors.newPassword || "10자 이상"}</small>
          </label>
          <label className="account-field">
            <span className="account-field__label">새 비밀번호 확인</span>
            <input
              name="passwordConfirm"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.passwordConfirm)}
              required
            />
            {errors.passwordConfirm ? <small className="account-field__status is-error">{errors.passwordConfirm}</small> : null}
          </label>
        </div>
        <footer className="account-card__footer">
          <Link href="/forgot-password" className="account-link">비밀번호를 잊은 경우 <Icon name="arrow-right" /></Link>
          <span aria-live="polite">{status}</span>
          <button type="submit" className="account-button is-primary" disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
        </footer>
      </form>
    </section>
  );
}
