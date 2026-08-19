"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { apiMutation } from "@/lib/api/client";
import type { AuthMember } from "@/types";

export function AccountNavigation({
  member,
  mobile = false,
  compact = false,
  onNavigate,
  onLoggedOut,
}: {
  member: AuthMember | null | undefined;
  mobile?: boolean;
  compact?: boolean;
  onNavigate?: () => void;
  onLoggedOut: () => void;
}) {
  const router = useRouter();

  async function logout() {
    await apiMutation<null>("/api/auth/logout", "POST");
    onLoggedOut();
    onNavigate?.();
    router.push("/");
    router.refresh();
  }

  if (compact) {
    return (
      <Link
        href={member ? "/studio" : "/register"}
        className="site-mobile-auth-link"
        onClick={onNavigate}
        aria-busy={member === undefined ? true : undefined}
      >
        {member ? "내 기록" : "시작하기"}
      </Link>
    );
  }
  if (member === undefined) {
    return mobile ? (
      <Link href="/login" onClick={onNavigate} aria-busy="true">
        <span>로그인 · 시작하기</span><span aria-hidden="true">→</span>
      </Link>
    ) : (
      <div className="site-account-entry" aria-busy="true">
        <Link href="/login" className="site-account-login">로그인</Link>
        <Link href="/register" className="site-profile-link site-profile-link--accent">시작하기</Link>
      </div>
    );
  }
  if (!member) {
    return mobile ? (
      <>
        <Link href="/register" onClick={onNavigate}><span>내 지구본 시작하기</span><span aria-hidden="true">→</span></Link>
        <Link href="/login" onClick={onNavigate}><span>로그인</span><span aria-hidden="true">→</span></Link>
      </>
    ) : (
      <div className="site-account-entry">
        <Link href="/login" className="site-account-login">로그인</Link>
        <Link href="/register" className="site-profile-link site-profile-link--accent">시작하기</Link>
      </div>
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
