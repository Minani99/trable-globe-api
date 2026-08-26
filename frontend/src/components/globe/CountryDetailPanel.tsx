"use client";

import Link from "next/link";

import { travelPath } from "@/lib/config";
import { formatDate, formatDateRange } from "@/lib/utils/format";
import { countryFlag } from "@/lib/worldLandmarks";
import type { TravelSummary, VisitedCountry } from "@/types";

interface CountryDetailPanelProps {
  country: VisitedCountry;
  travels: TravelSummary[];
  username: string;
  onClear: () => void;
}

/**
 * What the globe says when a country is selected.
 *
 * Anchored bottom-right over the globe on desktop and pinned as a bottom sheet on small
 * screens, so the sphere itself never gets covered by a panel that grew with the content.
 */
export function CountryDetailPanel({
  country,
  travels,
  username,
  onClear,
}: CountryDetailPanelProps) {
  const orderedTravels = [...travels].sort((left, right) => right.startDate.localeCompare(left.startDate));
  const firstTravel = orderedTravels.at(-1) ?? null;
  const latestTravel = orderedTravels[0] ?? null;

  return (
    <aside
      aria-label={`${country.nameKo} 여행 요약`}
      className="country-detail panel animate-fade-up z-20 w-full"
    >
      <div className="country-detail__header">
        <span className="country-detail__flag" aria-hidden="true">{countryFlag(country.iso2Code)}</span>
        <div className="min-w-0 flex-1">
          <h3>{country.nameKo}</h3>
          <p>{country.nameEn}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="국가 선택 해제"
          className="country-detail__close"
        >
          ×
        </button>
      </div>

      <dl className="country-detail__memory-stats">
        <div>
          <dt>여행</dt>
          <dd>{country.travelCount}</dd>
        </div>
        <div>
          <dt>도시</dt>
          <dd>{country.cityCount}</dd>
        </div>
        <div>
          <dt>첫 기억</dt>
          <dd>
            {firstTravel ? formatDate(firstTravel.startDate).slice(0, 7) : "—"}
          </dd>
        </div>
      </dl>

      {latestTravel ? (
        <Link href={travelPath(username, latestTravel.id)} className="country-detail__latest">
          <span>
            <small>최근 기억 · {formatDateRange(latestTravel.startDate, latestTravel.endDate)}</small>
            <strong>{latestTravel.title}</strong>
          </span>
          <span aria-hidden="true">↗</span>
        </Link>
      ) : null}

      <button
        type="button"
        onClick={onClear}
        className="country-detail__all"
      >
        전체 세계로 돌아가기
      </button>
    </aside>
  );
}
