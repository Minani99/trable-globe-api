"use client";

/* eslint-disable @next/next/no-html-link-for-pages -- Hard navigations keep cached offline documents usable without an RSC request. */

import { useEffect, useState } from "react";

import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { readCachedActiveTravel, type CachedTravel } from "@/lib/travel-offline";
import { todayInKorea } from "@/lib/utils/date";

type ActiveTravel = { username: string; cached: CachedTravel };

export function OfflineTripShell() {
  const [activeTravel, setActiveTravel] = useState<ActiveTravel | null | undefined>(undefined);
  const today = todayInKorea();

  useEffect(() => {
    queueMicrotask(() => setActiveTravel(readCachedActiveTravel(today)));
  }, [today]);

  return (
    <main id="main" className="offline-trip-page">
      <header className="offline-trip-header">
        <a href="/offline" aria-label="오프라인 안내로 돌아가기">←</a>
        <div>
          <span>TRAVEL GLOBE</span>
          <strong>{activeTravel?.cached.travel.title ?? "저장된 여행"}</strong>
        </div>
        <span className="offline-trip-header__state">오프라인</span>
      </header>

      <div className="offline-trip-page__body">
        {activeTravel === undefined ? (
          <section className="offline-trip-empty" aria-live="polite">
            <span className="offline-trip-empty__mark" aria-hidden="true">◎</span>
            <h1>저장된 일정을 확인하고 있어요</h1>
          </section>
        ) : activeTravel ? (
          <>
            <section className="offline-trip-desktop" aria-labelledby="offline-trip-desktop-heading">
              <p className="eyebrow">Saved itinerary</p>
              <h1 id="offline-trip-desktop-heading">{activeTravel.cached.travel.title}</h1>
              <p>{today} 일정입니다. 모바일에서는 완료 체크와 메모도 연결 없이 저장할 수 있습니다.</p>
              <ol>
                {activeTravel.cached.travel.places.filter((place) => place.visitedAt === today).map((place) => (
                  <li key={place.id}>
                    <time>{place.startTime?.slice(0, 5) ?? "시간 미정"}</time>
                    <div><strong>{place.placeName}</strong><small>{place.city?.nameKo ?? place.country.nameKo}{place.memo ? ` · ${place.memo}` : ""}</small></div>
                  </li>
                ))}
              </ol>
            </section>
            <MobileTripCompanion
              travel={activeTravel.cached.travel}
              today={today}
              username={activeTravel.username}
              variant="page"
            />
          </>
        ) : (
          <section className="offline-trip-empty">
            <span className="offline-trip-empty__mark" aria-hidden="true">◎</span>
            <p className="eyebrow">Offline</p>
            <h1>저장된 오늘 일정이 없어요</h1>
            <p>온라인에서 진행 중인 여행을 한 번 열면 다음부터 연결이 끊겨도 일정과 메모를 확인할 수 있습니다.</p>
            <a href="/studio">연결 후 내 여행 열기</a>
          </section>
        )}
      </div>
    </main>
  );
}
