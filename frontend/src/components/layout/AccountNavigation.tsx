"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiMutation } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function AccountNavigation({
  mobile = false,
  compact = false,
  onNavigate,
}: {
  mobile?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [member, setMember] = useState<AuthMember | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { headers: { Accept: "application/json" }, cache: "no-store" })
      .then(async (response) => {
        if (!active) return;
        if (!response.ok) {
          setMember(null);
          return;
        }
        const body = (await response.json()) as { data?: AuthMember };
        setMember(body.data ?? null);
      })
      .catch(() => active && setMember(null));
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await apiMutation<null>("/api/auth/logout", "POST");
    setMember(null);
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (compact) {
    return (
      <Link
        href={member ? "/studio" : "/login"}
        className="site-mobile-auth-link"
        onClick={onNavigate}
        aria-busy={member === undefined ? true : undefined}
      >
        {member ? "내 기록" : "로그인"}
      </Link>
    );
  }
  if (member === undefined) {
    return mobile ? (
      <Link href="/login" onClick={onNavigate} aria-busy="true">
        <span>로그인 · 시작하기</span><span aria-hidden="true">→</span>
      </Link>
    ) : (
      <Link href="/login" className="site-profile-link" aria-busy="true">로그인</Link>
    );
  }
  if (!member) {
    return mobile ? (
      <Link href="/login" onClick={onNavigate}><span>로그인 · 시작하기</span><span aria-hidden="true">→</span></Link>
    ) : (
      <Link href="/login" className="site-profile-link">로그인</Link>
    );
  }
  return mobile ? (
    <>
      <Link href="/studio" onClick={onNavigate}><span>내 여행 관리</span><span aria-hidden="true">→</span></Link>
      <button type="button" className="site-mobile-menu__button" onClick={logout}><span>로그아웃</span><span aria-hidden="true">↗</span></button>
    </>
  ) : (
    <div className="site-account-nav">
      <Link href="/studio" className="site-profile-link">내 기록</Link>
      <button type="button" onClick={logout}>로그아웃</button>
    </div>
  );
}
