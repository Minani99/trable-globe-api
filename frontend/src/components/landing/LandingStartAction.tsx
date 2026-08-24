"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";

export function LandingStartAction() {
  const member = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );

  useEffect(() => {
    if (member === undefined) void loadAuthMember();
  }, [member]);

  if (member === undefined) {
    return (
      <span className="landing-primary-cta is-loading" aria-label="계정 상태 확인 중">
        <span>계정 확인 중…</span>
      </span>
    );
  }

  return (
    <Link href={member ? "/studio/plans/new" : "/register?next=%2Fstudio%2Fplans%2Fnew"} className="landing-primary-cta group">
      <span>{member ? "새 여행 계획하기" : "3분 만에 여행 계획하기"}</span>
      <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
