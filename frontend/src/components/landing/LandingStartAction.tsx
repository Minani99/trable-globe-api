"use client";

import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { globePath } from "@/lib/config";

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
    <Link
      href={member ? globePath : "/register?next=%2Fstudio"}
      className="landing-primary-cta group"
    >
      <span>{member ? "내 지구본" : "계정 만들기"}</span>
      <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
    </Link>
  );
}
