"use client";

import { useEffect, useId, useRef, useState } from "react";

import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { apiSessionGet } from "@/lib/api/client";
import { cacheTravel, readCachedCurrentTravel, readCachedTravel } from "@/lib/travel-offline";
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
    cached: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!member || pathname.includes("/studio/travels/") || !window.matchMedia("(max-width: 700px)").matches) {
      return;
    }

    let active = true;
    const today = todayInKorea();
    const cached = readCachedCurrentTravel(member.username, today);
    if (cached) {
      queueMicrotask(() => {
        if (active) setTravelState({
          username: member.username,
          travel: summaryFromCachedTravel(cached.travel, cached.savedAt),
          detail: cached.travel,
          detailPending: false,
          cached: true,
        });
      });
    }
    apiSessionGet<OwnedTravelSummary[]>("/api/private/travels")
      .then(async (travels) => {
        const currentTravel = findCurrentTravel(travels);
        if (!currentTravel) {
          if (active) setTravelState({ username: member.username, travel: null, detail: null, detailPending: false, cached: false });
          return;
        }
        const cachedDetail = readCachedTravel(member.username, currentTravel.travel.id)?.travel ?? null;
        if (active) setTravelState({ username: member.username, travel: currentTravel, detail: cachedDetail, detailPending: !cachedDetail, cached: Boolean(cachedDetail) });
        try {
          const detail = await apiSessionGet<TravelDetail>(`/api/private/travels/${currentTravel.travel.id}`);
          cacheTravel(member.username, detail);
          if (active) setTravelState({ username: member.username, travel: currentTravel, detail, detailPending: false, cached: false });
        } catch {
          if (active) setTravelState({ username: member.username, travel: currentTravel, detail: cachedDetail, detailPending: false, cached: Boolean(cachedDetail) });
        }
      })
      .catch(() => {
        if (active && !cached) setTravelState({ username: member.username, travel: null, detail: null, detailPending: false, cached: false });
      });
    return () => {
      active = false;
    };
  }, [member, pathname]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const media = window.matchMedia("(max-width: 700px)");
    const closeOnDesktop = () => { if (!media.matches) setOpen(false); };
    media.addEventListener("change", closeOnDesktop);
    const trigger = triggerRef.current;
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      media.removeEventListener("change", closeOnDesktop);
      trigger?.focus({ preventScroll: true });
    };
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
        <dialog ref={dialogRef} className="mobile-journey-capture__panel" id={panelId} aria-label={`${travel.title} 빠른 기록`}
          onCancel={() => setOpen(false)}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) setOpen(false);
          }}>
          <header>
            <div>
              <small>여행 중 · {country}</small>
              <strong>{travel.title}</strong>
              {travelState?.cached ? <span>기기에 저장된 일정</span> : null}
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="빠른 기록 닫기">×</button>
          </header>
          {travelState?.detail ? (
            <MobileTripCompanion key={`${travelState.detail.id}-${travelState.cached ? "cached" : "live"}`} travel={travelState.detail} today={todayInKorea()} username={member.username} />
          ) : travelState?.detailPending ? (
            <div className="mobile-journey-capture__loading" role="status">오늘 일정을 불러오는 중…</div>
          ) : (
            <div className="mobile-journey-capture__loading" role="status">
              <span>오늘 일정을 불러오지 못했어요.</span>
              <a href={`/studio/travels/${travel.id}/edit`}>전체 계획에서 확인</a>
            </div>
          )}
        </dialog>
      ) : null}
      <button
        ref={triggerRef}
        type="button"
        className="mobile-journey-capture__trigger"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">＋</span>
        <span className="mobile-journey-capture__trigger-copy"><small>여행 중</small><strong>빠른 기록</strong></span>
      </button>
    </aside>
  );
}

function summaryFromCachedTravel(travel: TravelDetail, updatedAt: string): OwnedTravelSummary {
  const firstPlace = travel.places[0] ?? null;
  return {
    visibility: travel.visibility,
    updatedAt,
    travel: {
      id: travel.id,
      title: travel.title,
      description: travel.description,
      startDate: travel.startDate,
      endDate: travel.endDate,
      durationDays: travel.durationDays,
      coverImageUrl: travel.coverImageUrl,
      primaryCountry: firstPlace?.country ?? travel.countries[0] ?? null,
      primaryCity: firstPlace?.city ?? null,
      countries: travel.countries,
      routePoints: travel.places.map((place) => ({
        latitude: place.latitude,
        longitude: place.longitude,
        label: place.placeName,
        countryCode: place.country.iso2Code,
      })),
      placeCount: travel.places.length,
      photoCount: travel.photos.length,
    },
  };
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
