"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import type { AuthMember } from "@/types";

export function LandingStartAction() {
  const [member, setMember] = useState<AuthMember | null | undefined>(() => getCachedAuthMember());

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setMember);
    if (getCachedAuthMember() === undefined) void loadAuthMember();
    return unsubscribe;
  }, []);

  if (member === undefined) {
    return (
      <span className="landing-primary-cta is-loading" aria-label="계정 상태 확인 중">
        <span>계정 확인 중…</span>
      </span>
    );
  }

  return (
    <Link href={member ? "/studio" : "/register"} className="landing-primary-cta group">
      <span>{member ? "내 여행 이어가기" : "내 지구본 시작하기"}</span>
      <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
