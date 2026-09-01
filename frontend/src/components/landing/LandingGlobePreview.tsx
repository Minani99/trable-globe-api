"use client";

import Link from "next/link";
import { useState } from "react";

import { TravelGlobe, type GlobeCountryHover } from "@/components/globe/TravelGlobe";
import { profilePath, siteConfig } from "@/lib/config";
import type { GlobeRouteArc } from "@/lib/globeTimeline";
import { countryFlag, getWorldLandmarkPlace } from "@/lib/worldLandmarks";
import type { VisitedCountry } from "@/types";

const EMPTY_COUNTRIES: VisitedCountry[] = [];
const EMPTY_ROUTES: GlobeRouteArc[] = [];

export function LandingGlobePreview() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<GlobeCountryHover | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<GlobeCountryHover | null>(null);
  const [centeredCountry, setCenteredCountry] = useState<GlobeCountryHover | null>(null);
  const resolvedSelectedCountry = selectedCountry?.code === selectedCode
    ? selectedCountry
    : null;
  const activeCountry = resolvedSelectedCountry ?? hoveredCountry ?? centeredCountry;
  const activePlace = activeCountry ? getWorldLandmarkPlace(activeCountry.code) : null;

  const handleSelect = (code: string | null) => {
    setSelectedCode(code);
    if (!code) {
      setSelectedCountry(null);
    }
  };

  return (
    <div id="world-explorer" className="landing-globe-link landing-reveal landing-reveal--visual">
      <figure className="landing-globe-scene">
        <div className="landing-globe-frame">
          <div className="landing-globe-live">
            <TravelGlobe
              countries={EMPTY_COUNTRIES}
              selectedCode={selectedCode}
              routeArcs={EMPTY_ROUTES}
              onSelect={handleSelect}
              onHover={() => undefined}
              onCountryHover={setHoveredCountry}
              onCountryCenter={setCenteredCountry}
              onCountrySelect={setSelectedCountry}
              mode="world"
            />
          </div>
          <span className="landing-globe-vignette" aria-hidden="true" />

          <dl
            className="landing-globe-stats is-ready"
            aria-label="전 세계 랜드마크 탐색 범위"
          >
            <GlobeStat label="Countries" value="190+" />
            <GlobeStat label="Landmarks" value="190+" />
            <GlobeStat label="Explore" value="360°" />
            <GlobeStat label="Focus" value="Click" />
          </dl>

          <div className="landing-landmark-card" aria-live="polite">
            {activeCountry && activePlace ? (
              <>
                <span className="landing-landmark-card__flag" aria-hidden="true">
                  {countryFlag(activeCountry.code)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-content truncate text-[0.96rem] font-medium">
                    {activeCountry.nameKo}
                  </p>
                  <p className="text-content-faint mt-0.5 truncate text-[0.66rem]">
                    {activeCountry.nameEn}
                  </p>
                </div>
                <div className="min-w-0 max-w-[52%] text-right">
                  <p className="text-content-faint text-[0.58rem] font-semibold tracking-[0.13em] uppercase">
                    Landmark
                  </p>
                  <p className="text-content-muted mt-1 truncate text-[0.72rem] font-medium">
                    {activePlace.place}
                  </p>
                </div>
                {resolvedSelectedCountry ? (
                  <Link
                    href={profilePath(siteConfig.demoUsername)}
                    className="landing-landmark-card__action"
                  >
                    <span>여러 나라가 쌓인 샘플 보기</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </>
            ) : (
              <div>
                <p className="text-content text-[0.88rem] font-medium">190여 개 나라를 탐색해 보세요</p>
                <p className="text-content-faint mt-1 text-[0.68rem]">
                  모든 나라에 마우스를 올리거나 눌러 대표 랜드마크를 확인할 수 있어요.
                </p>
              </div>
            )}
          </div>
        </div>

        <figcaption className="sr-only">
          모든 국가에 마우스를 올려 대표 랜드마크나 도시를 확인할 수 있는 세계 지구본
        </figcaption>
      </figure>
    </div>
  );
}

function GlobeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
