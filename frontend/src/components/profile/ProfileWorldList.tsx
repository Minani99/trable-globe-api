"use client";

import Link from "next/link";

import { countryFlag } from "@/lib/worldLandmarks";
import { travelPath } from "@/lib/config";
import { formatDate, formatDateRange } from "@/lib/utils/format";
import type { TravelSummary, VisitedCountry } from "@/types";

interface ProfileWorldListProps {
  countries: VisitedCountry[];
  travels: TravelSummary[];
  username: string;
  onCountrySelect: (code: string) => void;
}

/** A familiar, text-first doorway into the same data rendered by the globe. */
export function ProfileWorldList({
  countries,
  travels,
  username,
  onCountrySelect,
}: ProfileWorldListProps) {
  return (
    <section className="profile-world-list" aria-label="나라와 여행 목록">
      <div className="profile-world-list__countries">
        <div className="profile-world-list__heading">
          <div>
            <h2>나라별로 둘러보기</h2>
          </div>
          <span>{countries.length}개 나라</span>
        </div>
        <ul>
          {countries.map((country, index) => (
            <li key={country.iso2Code}>
              <button type="button" onClick={() => onCountrySelect(country.iso2Code)}>
                <span className="profile-world-list__index">{String(index + 1).padStart(2, "0")}</span>
                <span className="profile-world-list__flag" aria-hidden="true">
                  {countryFlag(country.iso2Code)}
                </span>
                <span className="profile-world-list__country">
                  <strong>{country.nameKo}</strong>
                  <small>{country.nameEn}</small>
                </span>
                <span className="profile-world-list__stats">
                  여행 {country.travelCount} · 도시 {country.cityCount}
                  <small>{country.lastVisitedAt ? `${formatDate(country.lastVisitedAt)} 방문` : "방문 기록"}</small>
                </span>
                <span className="profile-world-list__arrow" aria-hidden="true">→</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <aside className="profile-world-list__recent" aria-labelledby="recent-travel-heading">
        <div className="profile-world-list__heading">
          <div>
            <h2 id="recent-travel-heading">최근 여행</h2>
          </div>
        </div>
        <ol>
          {travels.slice(0, 4).map((travel) => (
            <li key={travel.id}>
              <Link href={travelPath(username, travel.id)}>
                <span>{travel.primaryCountry ? countryFlag(travel.primaryCountry.iso2Code) : "✦"}</span>
                <div>
                  <strong>{travel.title}</strong>
                  <small>{formatDateRange(travel.startDate, travel.endDate)}</small>
                </div>
                <span aria-hidden="true">↗</span>
              </Link>
            </li>
          ))}
        </ol>
      </aside>
    </section>
  );
}
