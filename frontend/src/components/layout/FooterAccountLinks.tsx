"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import type { AuthMember } from "@/types";

const linkClass = "transition-colors hover:text-[var(--text-primary)]";

export function FooterAccountLinks() {
  const [member, setMember] = useState<AuthMember | null | undefined>(getCachedAuthMember);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setMember);
    if (getCachedAuthMember() === undefined) void loadAuthMember();
    return unsubscribe;
  }, []);

  if (member === undefined) return null;

  return member ? (
    <>
      <li><Link className={linkClass} href="/studio">내 여행 기록</Link></li>
      <li><Link className={linkClass} href="/settings#profile">프로필 설정</Link></li>
    </>
  ) : (
    <>
      <li><Link className={linkClass} href="/register">시작하기</Link></li>
      <li><Link className={linkClass} href="/login">로그인</Link></li>
    </>
  );
}
