"use client";

import { formatDateRange } from "@/lib/utils/format";
import type { TravelSummary, VisitedCountry } from "@/types";

export function GlobeMemorySpotlight({
  country,
  travel,
  timelineActive,
  onSelect,
}: {
  country: VisitedCountry;
  travel: TravelSummary | null;
  timelineActive: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="globe-memory-spotlight"
      onClick={onSelect}
      aria-label={`${country.nameKo} 여행 기억 열기`}
    >
      <span className="globe-memory-spotlight__signal" aria-hidden="true" />
      <span className="globe-memory-spotlight__body">
        <small>{timelineActive ? "그때 중심에 있던 나라" : "지금 중심에 있는 기억"}</small>
        <strong>{country.nameKo}</strong>
        {travel ? (
          <span>{travel.title} · {formatDateRange(travel.startDate, travel.endDate)}</span>
        ) : (
          <span>여행 {country.travelCount}회 · 도시 {country.cityCount}곳</span>
        )}
      </span>
      <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
    </button>
  );
}
