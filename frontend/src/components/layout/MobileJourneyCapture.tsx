"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";

import { apiSessionGet } from "@/lib/api/client";
import type { AuthMember, OwnedTravelSummary } from "@/types";

interface MobileJourneyCaptureProps {
  member: AuthMember | null | undefined;
  pathname: string;
}

export function MobileJourneyCapture({ member, pathname }: MobileJourneyCaptureProps) {
  const panelId = useId();
  const [travelState, setTravelState] = useState<{ username: string; travel: OwnedTravelSummary | null } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!member || !window.matchMedia("(max-width: 700px)").matches) {
      return;
    }

    let active = true;
    apiSessionGet<OwnedTravelSummary[]>("/api/private/travels")
      .then((travels) => {
        if (active) setTravelState({ username: member.username, travel: findCurrentTravel(travels) });
      })
      .catch(() => {
        if (active) setTravelState({ username: member.username, travel: null });
      });
    return () => {
      active = false;
    };
  }, [member]);

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
  const editPath = `/studio/travels/${travel.id}/edit`;
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
          <nav aria-label="빠른 기록 종류">
            <QuickCaptureLink href={`${editPath}#travel-place-editor`} label="장소" detail="지금 있는 곳" icon="pin" onNavigate={() => setOpen(false)} />
            <QuickCaptureLink href={`${editPath}#travel-photo-editor`} label="사진" detail="여러 장 선택" icon="photo" onNavigate={() => setOpen(false)} />
            <QuickCaptureLink href={`${editPath}#travel-note-editor`} label="메모" detail="한 줄 기억" icon="note" onNavigate={() => setOpen(false)} />
          </nav>
          <Link className="mobile-journey-capture__edit" href={editPath} onClick={() => setOpen(false)}>
            전체 여행 편집 <span aria-hidden="true">→</span>
          </Link>
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
        <strong>빠른 기록</strong>
      </button>
    </aside>
  );
}

function QuickCaptureLink({
  href,
  label,
  detail,
  icon,
  onNavigate,
}: {
  href: string;
  label: string;
  detail: string;
  icon: "pin" | "photo" | "note";
  onNavigate: () => void;
}) {
  return (
    <Link href={href} onClick={onNavigate}>
      <QuickCaptureIcon name={icon} />
      <strong>{label}</strong>
      <small>{detail}</small>
    </Link>
  );
}

function QuickCaptureIcon({ name }: { name: "pin" | "photo" | "note" }) {
  if (name === "pin") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }
  if (name === "photo") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m5.5 17 4.3-4 2.9 2.5 2.4-2.2 3.4 3.7" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4.5h14v15H5z" /><path d="M8 9h8M8 12.5h8M8 16h5" /></svg>;
}

function findCurrentTravel(travels: OwnedTravelSummary[]): OwnedTravelSummary | null {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return travels
    .filter(({ travel }) => travel.startDate <= today && today <= travel.endDate)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null;
}
