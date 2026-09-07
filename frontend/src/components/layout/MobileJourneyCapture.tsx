"use client";

import { useEffect, useId, useState } from "react";

import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { apiSessionGet } from "@/lib/api/client";
import type { AuthMember, OwnedTravelSummary, TravelDetail } from "@/types";

interface MobileJourneyCaptureProps {
  member: AuthMember | null | undefined;
  pathname: string;
}

export function MobileJourneyCapture({ member, pathname }: MobileJourneyCaptureProps) {
  const panelId = useId();
  const [travelState, setTravelState] = useState<{
    username: string;
    travel: OwnedTravelSummary | null;
    detail: TravelDetail | null;
    detailPending: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!member || pathname.includes("/studio/travels/") || !window.matchMedia("(max-width: 700px)").matches) {
      return;
    }

    let active = true;
    apiSessionGet<OwnedTravelSummary[]>("/api/private/travels")
      .then(async (travels) => {
        const currentTravel = findCurrentTravel(travels);
        if (!currentTravel) {
          if (active) setTravelState({ username: member.username, travel: null, detail: null, detailPending: false });
          return;
        }
        if (active) setTravelState({ username: member.username, travel: currentTravel, detail: null, detailPending: true });
        try {
          const detail = await apiSessionGet<TravelDetail>(`/api/private/travels/${currentTravel.travel.id}`);
          if (active) setTravelState({ username: member.username, travel: currentTravel, detail, detailPending: false });
        } catch {
          if (active) setTravelState({ username: member.username, travel: currentTravel, detail: null, detailPending: false });
        }
      })
      .catch(() => {
        if (active) setTravelState({ username: member.username, travel: null, detail: null, detailPending: false });
      });
    return () => {
      active = false;
    };
  }, [member, pathname]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const currentTravel = member && travelState?.username === member.username ? travelState.travel : null;
  if (!member || !currentTravel || (pathname.includes("/studio/travels/") && pathname.endsWith("/edit"))) {
    return null;
  }

  const travel = currentTravel.travel;
  const country = travel.primaryCountry?.nameKo ?? travel.countries[0]?.nameKo ?? "현재 여행";

  return (
    <aside className={`mobile-journey-capture${open ? " is-open" : ""}`} aria-label="여행 중 빠른 기록">
      {open ? (
        <div className="mobile-journey-capture__panel" id={panelId} role="region" aria-label={`${travel.title} 빠른 기록`}>
          <header>
            <div>
              <small>NOW · {country}</small>
              <strong>{travel.title}</strong>
              <span>오늘 진행 중인 여행을 자동으로 선택했어요.</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="빠른 기록 닫기">×</button>
          </header>
          {travelState?.detail ? (
            <MobileTripCompanion travel={travelState.detail} today={todayInKorea()} />
          ) : travelState?.detailPending ? (
            <div className="mobile-journey-capture__loading" role="status">오늘 일정을 불러오는 중…</div>
          ) : (
            <div className="mobile-journey-capture__loading" role="status">
              <span>오늘 일정을 불러오지 못했어요.</span>
              <a href={`/studio/travels/${travel.id}/edit`}>전체 계획에서 확인</a>
            </div>
          )}
        </div>
      ) : null}
      <button
        type="button"
        className="mobile-journey-capture__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">＋</span>
        <span className="mobile-journey-capture__trigger-copy"><small>여행 중</small><strong>빠른 기록</strong></span>
      </button>
    </aside>
  );
}

function findCurrentTravel(travels: OwnedTravelSummary[]): OwnedTravelSummary | null {
  const today = todayInKorea();

  return travels
    .filter(({ travel }) => travel.startDate <= today && today <= travel.endDate)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}

function todayInKorea(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
