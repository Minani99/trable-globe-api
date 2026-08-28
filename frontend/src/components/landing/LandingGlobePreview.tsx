"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { TravelGlobe, type GlobeCountryHover } from "@/components/globe/TravelGlobe";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "@/lib/api/profile";
import { profilePath, siteConfig } from "@/lib/config";
import { buildGlobeTimeline } from "@/lib/globeTimeline";
import { buildTravelRecap } from "@/lib/travelInsights";
import { formatStat } from "@/lib/utils/format";
import { countryFlag, getWorldLandmarkPlace } from "@/lib/worldLandmarks";
import type { TravelSummary, UserProfile, VisitedCountry } from "@/types";

interface DemoWorldData {
  profile: UserProfile;
  countries: VisitedCountry[];
  travels: TravelSummary[];
}

export function LandingGlobePreview() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<GlobeCountryHover | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<GlobeCountryHover | null>(null);
  const [centeredCountry, setCenteredCountry] = useState<GlobeCountryHover | null>(null);
  const [demoWorld, setDemoWorld] = useState<DemoWorldData | null>(null);
  const selectedVisitedCountry = selectedCode
    ? demoWorld?.countries.find((country) => country.iso2Code === selectedCode) ?? null
    : null;
  const resolvedSelectedCountry = selectedCountry?.code === selectedCode
    ? selectedCountry
    : selectedVisitedCountry ? {
        code: selectedVisitedCountry.iso2Code,
        nameKo: selectedVisitedCountry.nameKo,
        nameEn: selectedVisitedCountry.nameEn,
      } : null;
  const activeCountry = resolvedSelectedCountry ?? hoveredCountry ?? centeredCountry;
  const activePlace = activeCountry ? getWorldLandmarkPlace(activeCountry.code) : null;
  const routeArcs = useMemo(
    () => buildGlobeTimeline(demoWorld?.travels ?? []).arcs,
    [demoWorld?.travels],
  );
  const recap = useMemo(
    () => demoWorld ? buildTravelRecap(demoWorld.travels, null) : null,
    [demoWorld],
  );

  useEffect(() => {
    let active = true;
    const username = siteConfig.demoUsername;
    Promise.all([
      fetchProfile(username),
      fetchVisitedCountries(username),
      fetchTravels(username),
    ])
      .then(([profile, countries, travels]) => {
        if (active) setDemoWorld({ profile, countries, travels });
      })
      // The interactive world explorer remains useful while the public sample wakes up.
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

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
              countries={demoWorld?.countries ?? []}
              selectedCode={selectedCode}
              routeArcs={routeArcs}
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
            className={`landing-globe-stats${demoWorld ? " is-ready" : ""}`}
            aria-label={demoWorld ? "샘플 여행 세계 통계" : "샘플 여행 세계 불러오는 중"}
          >
            <GlobeStat label="Countries" value={demoWorld ? formatStat(demoWorld.profile.statistics.countryCount) : "—"} />
            <GlobeStat label="Cities" value={demoWorld ? formatStat(demoWorld.profile.statistics.cityCount) : "—"} />
            <GlobeStat label="Journeys" value={demoWorld ? formatStat(demoWorld.profile.statistics.travelCount) : "—"} />
            <GlobeStat
              label="Distance"
              value={recap ? `${formatDistance(recap.distanceKm)} km` : "—"}
            />
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
                    <span>완성된 샘플 세계 둘러보기</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </>
            ) : (
              <div>
                <p className="text-content text-[0.88rem] font-medium">세계를 탐색해 보세요</p>
                <p className="text-content-faint mt-1 text-[0.68rem]">
                  회전 중인 국가를 누르면 중앙에 고정됩니다.
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

function formatDistance(value: number): string {
  return new Intl.NumberFormat("ko-KR").format(value);
}
