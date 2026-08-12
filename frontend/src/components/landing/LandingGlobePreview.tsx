"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { TravelGlobe } from "@/components/globe/TravelGlobe";
import type { VisitedCountry } from "@/types";

interface LandingGlobePreviewProps {
  href: string;
}

const SAMPLE_COUNTRIES: VisitedCountry[] = [
  {
    iso2Code: "KR",
    iso3Code: "KOR",
    nameEn: "South Korea",
    nameKo: "대한민국",
    latitude: 36.5,
    longitude: 127.8,
    travelCount: 1,
    cityCount: 2,
    lastVisitedAt: "2025-04-07",
  },
  {
    iso2Code: "JP",
    iso3Code: "JPN",
    nameEn: "Japan",
    nameKo: "일본",
    latitude: 36.2,
    longitude: 138.2,
    travelCount: 2,
    cityCount: 2,
    lastVisitedAt: "2026-03-08",
  },
  {
    iso2Code: "TW",
    iso3Code: "TWN",
    nameEn: "Taiwan",
    nameKo: "대만",
    latitude: 23.7,
    longitude: 121,
    travelCount: 1,
    cityCount: 1,
    lastVisitedAt: "2026-05-18",
  },
  {
    iso2Code: "US",
    iso3Code: "USA",
    nameEn: "United States",
    nameKo: "미국",
    latitude: 38,
    longitude: -97,
    travelCount: 1,
    cityCount: 2,
    lastVisitedAt: "2025-10-18",
  },
];

export function LandingGlobePreview({ href }: LandingGlobePreviewProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const selectedCountry = useMemo(
    () => SAMPLE_COUNTRIES.find((country) => country.iso2Code === selectedCode) ?? null,
    [selectedCode],
  );

  return (
    <div className="landing-globe-link landing-reveal landing-reveal--visual">
      <figure className="landing-globe-scene">
        <div className="landing-globe-frame">
          <div className="landing-globe-live">
            <TravelGlobe
              countries={SAMPLE_COUNTRIES}
              selectedCode={selectedCode}
              onSelect={setSelectedCode}
              onHover={() => undefined}
            />
          </div>
          <span className="landing-globe-vignette" aria-hidden="true" />
          <span className="landing-globe-grid" aria-hidden="true" />

          <div className="landing-globe-meta" aria-hidden="true">
            <span>LIVE GLOBE · SEOUL ORIGIN</span>
            <span>04 COUNTRIES · 07 CITIES</span>
          </div>

          <div className="landing-memory-card" aria-live="polite">
            <div>
              <p className="eyebrow">{selectedCountry ? "Selected country" : "Latest journey"}</p>
              <p className="text-content mt-1 text-[0.96rem] font-medium">
                {selectedCountry ? selectedCountry.nameKo : "타이베이, 다시."}
              </p>
            </div>
            <div className="text-right">
              <p className="text-content-faint font-mono text-[0.64rem]">
                {selectedCountry
                  ? `TRAVELS · ${String(selectedCountry.travelCount).padStart(2, "0")}`
                  : "MAY · 2026"}
              </p>
              <p className="text-content-muted mt-1 text-[0.7rem]">
                {selectedCountry ? `도시 ${selectedCountry.cityCount}곳` : "2박 3일"}
              </p>
            </div>
          </div>

          <Link href={href} className="landing-globe-cta" aria-label="공개 여행 지구본 보기">
            <span>전체 지구본 보기</span>
            <span className="landing-globe-cta__arrow" aria-hidden="true">↗</span>
          </Link>
        </div>

        <figcaption className="sr-only">
          직접 돌리고 국가를 선택할 수 있는 Travel Globe 공개 샘플 미리보기
        </figcaption>
      </figure>
    </div>
  );
}
