"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import { setCachedAuthMember } from "@/lib/auth-state";

export function SettingsSessionActions({ username }: { username: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await apiMutation<null>("/api/auth/logout", "POST");
      setCachedAuthMember(null);
      showFeedback("안전하게 로그아웃했습니다.", "success");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      showFeedback(error instanceof ApiError ? error.message : "로그아웃하지 못했습니다. 다시 시도해 주세요.", "error");
      setPending(false);
    }
  }

  return (
    <div className="settings-hero__actions" aria-label="계정 바로가기">
      <Link href={`/${username}`} className="studio-secondary-action">공개 프로필 보기 <span aria-hidden="true">↗</span></Link>
      <button
        type="button"
        className="settings-session-logout"
        onClick={logout}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? "로그아웃 중…" : "로그아웃"}
      </button>
    </div>
  );
}
