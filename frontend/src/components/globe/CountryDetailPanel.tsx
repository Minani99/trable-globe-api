"use client";

import Link from "next/link";

import { travelPath } from "@/lib/config";
import { formatDateRange } from "@/lib/utils/format";
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
  return (
    <aside
      aria-label={`${country.nameKo} 여행 요약`}
      className="panel animate-fade-up z-20 w-full p-5 lg:w-[320px]"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-content text-[1.35rem] leading-tight font-light tracking-tight">
            {country.nameKo}
          </h3>
          <p className="eyebrow mt-1">{country.nameEn}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          aria-label="국가 선택 해제"
          className="text-content-faint hover:text-content -mt-1 -mr-1 flex h-7 w-7 items-center justify-center rounded-md text-lg leading-none transition-colors"
        >
          ×
        </button>
      </div>

      <dl className="border-border-subtle mb-4 flex gap-6 border-y py-3">
        <div>
          <dt className="eyebrow">여행</dt>
          <dd className="text-content mt-1 font-mono text-[1.05rem]">{country.travelCount}</dd>
        </div>
        <div>
          <dt className="eyebrow">도시</dt>
          <dd className="text-content mt-1 font-mono text-[1.05rem]">{country.cityCount}</dd>
        </div>
      </dl>

      {travels.length > 0 ? (
        <ul className="flex flex-col gap-1">
          {travels.map((travel) => (
            <li key={travel.id}>
              <Link
                href={travelPath(username, travel.id)}
                className="hover:bg-surface-hover -mx-2 flex flex-col gap-0.5 rounded-md px-2 py-2 transition-colors"
              >
                <span className="text-content text-[0.88rem] leading-snug">{travel.title}</span>
                <span className="text-content-faint font-mono text-[0.7rem]">
                  {formatDateRange(travel.startDate, travel.endDate)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-caption">이 국가에 공개된 여행 기록이 없습니다.</p>
      )}

      <button
        type="button"
        onClick={onClear}
        className="border-border-subtle text-content-muted mt-4 w-full rounded-md border py-2 text-[0.76rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
      >
        전체 여행 보기
      </button>
    </aside>
  );
}
