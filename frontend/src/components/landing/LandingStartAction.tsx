"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { profilePath, siteConfig } from "@/lib/config";
import { apiSessionGet } from "@/lib/api/client";
import { nextJourneyAction, type JourneyNextAction } from "@/lib/journey-next-action";
import { todayInKorea } from "@/lib/utils/date";
import type { OwnedTravelSummary } from "@/types";

export function LandingStartAction() {
  const [journey, setJourney] = useState<{ username: string; action: JourneyNextAction | null } | null>(null);
  const member = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );

  useEffect(() => {
    if (member === undefined) void loadAuthMember();
  }, [member]);

  useEffect(() => {
    if (!member) return;
    let active = true;
    const refresh = () => {
      if (document.visibilityState === "hidden") return;
      apiSessionGet<OwnedTravelSummary[]>("/api/private/travels").then((travels) => {
        if (active) setJourney({ username: member.username, action: nextJourneyAction(travels, todayInKorea()) });
      }).catch(() => {
        if (active) setJourney(null);
      });
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; document.removeEventListener("visibilitychange", refresh); };
  }, [member]);

  if (member === undefined) {
    return (
      <span className="landing-primary-cta is-loading" aria-label="계정 상태 확인 중">
        <span>계정 확인 중…</span>
      </span>
    );
  }

  const loaded = member && journey?.username === member.username;
  const action = loaded ? journey.action : null;
  return (
    <>
    <Link
      href={member ? action?.href ?? (loaded ? "/studio/plans/new" : "/studio") : "/register?next=%2Fstudio"}
      className="landing-primary-cta group"
      title={action?.trip.travel.title}
    >
      <span>{member ? action?.label ?? (loaded ? "새 여행 계획" : "내 여행 열기") : "계정 만들기"}</span>
      <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
    </Link>
    <Link href={member ? "/studio" : profilePath(siteConfig.demoUsername)} className="landing-secondary-cta">
      {member ? "내 여행 전체 보기" : "샘플 지구본 보기"}
    </Link>
    </>
  );
}
