"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import { setCachedAuthMember } from "@/lib/auth-state";
import type { AuthMember } from "@/types";
import { Icon } from "@/components/common/Icon";

export function SettingsSessionActions({ member }: { member: AuthMember }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    if (pending) return;
    setPending(true);
    setCachedAuthMember(null);
    try {
      await apiMutation<null>("/api/auth/logout", "POST");
      showFeedback("로그아웃했습니다.", "success");
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setCachedAuthMember(member);
      showFeedback(error instanceof ApiError ? error.message : "로그아웃하지 못했습니다. 다시 시도해 주세요.", "error");
      setPending(false);
    }
  }

  return (
    <div className="account-hero__actions" aria-label="계정 바로가기">
      <Link href={`/${member.username}`} className="account-button is-secondary">공개 프로필 <Icon name="arrow-up-right" /></Link>
      <button
        type="button"
        className="account-button is-ghost"
        onClick={logout}
        disabled={pending}
        aria-busy={pending}
      >
        <Icon name="logout" />{pending ? "로그아웃 중…" : "로그아웃"}
      </button>
    </div>
  );
}
