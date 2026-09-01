"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
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
    <section id="security" className="studio-account settings-card settings-security" aria-labelledby="settings-security-heading">
      <div className="studio-account__heading">
        <div>
          <h2 id="settings-security-heading">비밀번호</h2>
          <p>변경하면 다른 기기에서 로그아웃됩니다.</p>
        </div>
      </div>
      <form className="studio-account__identity settings-password-form" onSubmit={changePassword}>
        <label>
          <span>현재 비밀번호</span>
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            required
          />
          {errors.currentPassword ? <small className="field-validation is-error">{errors.currentPassword}</small> : null}
        </label>
        <label>
          <span>새 비밀번호</span>
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
          <small id="settings-new-password-help">{errors.newPassword || "10자 이상"}</small>
        </label>
        <label>
          <span>새 비밀번호 확인</span>
          <input
            name="passwordConfirm"
            type="password"
            minLength={10}
            maxLength={72}
            autoComplete="new-password"
            aria-invalid={Boolean(errors.passwordConfirm)}
            required
          />
          {errors.passwordConfirm ? <small className="field-validation is-error">{errors.passwordConfirm}</small> : null}
        </label>
        <div className="studio-account__identity-actions">
          <span aria-live="polite">{status}</span>
          <button type="submit" disabled={pending}>{pending ? "변경 중…" : "비밀번호 변경"}</button>
        </div>
      </form>
      <Link href="/forgot-password" className="settings-forgot-link">비밀번호를 잊은 경우</Link>
    </section>
  );
}
