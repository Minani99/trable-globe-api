"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";

const linkClass = "transition-colors hover:text-[var(--text-primary)]";

export function FooterAccountLinks() {
  const member = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );

  useEffect(() => {
    if (member === undefined) void loadAuthMember();
  }, [member]);

  if (member === undefined) return null;

  return member ? (
    <>
      <li><Link className={linkClass} href="/studio/plans/new">새 여행 계획</Link></li>
      <li><Link className={linkClass} href="/studio">계획과 기록</Link></li>
      <li><Link className={linkClass} href="/settings#profile">프로필 설정</Link></li>
    </>
  ) : (
    <>
      <li><Link className={linkClass} href="/register">시작하기</Link></li>
      <li><Link className={linkClass} href="/login">로그인</Link></li>
    </>
  );
}
