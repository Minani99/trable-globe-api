"use client";

import { AppIcon } from "@/components/common/AppIcon";
import { useEffect, useId, useRef, useState } from "react";

import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { apiSessionGet } from "@/lib/api/client";
import { journeyGroups } from "@/lib/journey-next-action";
import { todayInKorea } from "@/lib/utils/date";
import { cacheTravel, readCachedCurrentTravel, readCachedTravel } from "@/lib/travel-offline";
import type { AuthMember, OwnedTravelSummary, TravelDetail } from "@/types";

interface MobileJourneyCaptureProps {
  member: AuthMember | null | undefined;
  pathname: string;
}

/**
 * Every route change remounts this component. Reusing one server answer for a short while
 * keeps quick menu hops from re-reading the whole trip list and itinerary each time; the
 * device cache, which the companion updates on every edit, stays the freshest copy.
 */
const CURRENT_TRAVEL_TTL_MS = 60_000;
let currentTravelRequest: {
  username: string;
  requestedAt: number;
  promise: Promise<{ travel: OwnedTravelSummary | null; detail: TravelDetail | null; fetchedAt: number }>;
} | null = null;

function loadCurrentTravel(username: string) {
  if (currentTravelRequest?.username === username && Date.now() - currentTravelRequest.requestedAt < CURRENT_TRAVEL_TTL_MS) {
    return currentTravelRequest.promise;
  }
  const promise = apiSessionGet<OwnedTravelSummary[]>("/api/private/travels").then(async (travels) => {
    const travel = findCurrentTravel(travels);
    if (!travel) return { travel: null, detail: null, fetchedAt: Date.now() };
    try {
      const detail = await apiSessionGet<TravelDetail>(`/api/private/travels/${travel.travel.id}`);
      const fetchedAt = Date.now();
      cacheTravel(username, detail);
      return { travel, detail, fetchedAt };
    } catch {
      return { travel, detail: null, fetchedAt: Date.now() };
    }
  });
  currentTravelRequest = { username, requestedAt: Date.now(), promise };
  promise.catch(() => {
    if (currentTravelRequest?.promise === promise) currentTravelRequest = null;
  });
  return promise;
}

export function MobileJourneyCapture({ member, pathname }: MobileJourneyCaptureProps) {
  const panelId = useId();
  const [travelState, setTravelState] = useState<{
    username: string;
    travel: OwnedTravelSummary | null;
    detail: TravelDetail | null;
    cached: boolean;
  } | null>(null);
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (pathname.includes("/studio/travels/")) {
      // Trips are edited here, so the next page should read them again.
      currentTravelRequest = null;
      return;
    }
    if (!member || !window.matchMedia("(max-width: 700px)").matches) {
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
          cached: true,
        });
      });
    }
    loadCurrentTravel(member.username)
      .then(({ travel, detail, fetchedAt }) => {
        if (!active) return;
        if (!travel) {
          setTravelState({ username: member.username, travel: null, detail: null, cached: false });
          return;
        }
        // Edits made in the companion since the server answer live in the device cache.
        const stored = readCachedTravel(member.username, travel.travel.id);
        const storedIsCurrent = stored && (!detail || Date.parse(stored.savedAt) >= fetchedAt);
        setTravelState({
          username: member.username,
          travel,
          detail: storedIsCurrent ? stored.travel : detail,
          cached: !detail && Boolean(stored),
        });
      })
      .catch(() => {
        if (active && !cached) setTravelState({ username: member.username, travel: null, detail: null, cached: false });
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
            <button type="button" onClick={() => setOpen(false)} aria-label="빠른 기록 닫기"><AppIcon name="close" /></button>
          </header>
          {travelState?.detail ? (
            <MobileTripCompanion key={`${travelState.detail.id}-${travelState.cached ? "cached" : "live"}`} travel={travelState.detail} today={todayInKorea()} username={member.username} />
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
  return journeyGroups(travels, todayInKorea()).active[0] ?? null;
}
