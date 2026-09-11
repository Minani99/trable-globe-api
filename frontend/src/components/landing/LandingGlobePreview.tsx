"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { TravelGlobe, type GlobeCountryHover } from "@/components/globe/TravelGlobe";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "@/lib/api/profile";
import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { profilePath, siteConfig } from "@/lib/config";
import { buildGlobeTimeline } from "@/lib/globeTimeline";
import { countryFlag, getWorldLandmarkPlace } from "@/lib/worldLandmarks";
import type { TravelSummary, UserProfile, VisitedCountry } from "@/types";

const EMPTY_COUNTRIES: VisitedCountry[] = [];
const ignoreHover = () => undefined;

interface LandingWorld {
  profile: UserProfile;
  countries: VisitedCountry[];
  travels: TravelSummary[];
}

interface LandingWorldRequest {
  username: string;
  world: LandingWorld | null;
  failed: boolean;
}

export function LandingGlobePreview() {
  const member = useSyncExternalStore(
    subscribeToAuthState,
    getCachedAuthMember,
    () => undefined,
  );
  const [worldRequest, setWorldRequest] = useState<LandingWorldRequest | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<GlobeCountryHover | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<GlobeCountryHover | null>(null);
  const [centeredCountry, setCenteredCountry] = useState<GlobeCountryHover | null>(null);
  const username = member?.username ?? siteConfig.demoUsername;
  const isOwnWorld = member !== undefined && member !== null;
  const resolvedRequest = worldRequest?.username === username ? worldRequest : null;
  const world = resolvedRequest?.world ?? null;
  const routeArcs = useMemo(() => buildGlobeTimeline(world?.travels ?? []).arcs, [world?.travels]);

  useEffect(() => {
    if (member === undefined) {
      void loadAuthMember();
      return;
    }

    let active = true;
    Promise.all([
      fetchProfile(username),
      fetchVisitedCountries(username),
      fetchTravels(username),
    ])
      .then(([profile, countries, travels]) => {
        if (active) {
          setWorldRequest({ username, world: { profile, countries, travels }, failed: false });
        }
      })
      .catch(() => {
        if (active) setWorldRequest({ username, world: null, failed: true });
      });

    return () => {
      active = false;
    };
  }, [member, username]);

  const resolvedSelectedCountry = selectedCountry?.code === selectedCode
    ? selectedCountry
    : null;
  const activeCountry = resolvedSelectedCountry ?? hoveredCountry ?? centeredCountry;
  const activePlace = activeCountry ? getWorldLandmarkPlace(activeCountry.code) : null;
  const activeVisit = world?.countries.find((country) => country.iso2Code === activeCountry?.code);
  const statistics = world?.profile.statistics;
  const worldLabel = isOwnWorld ? `${world?.profile.displayName ?? member?.displayName}님의 지구본` : "샘플 지구본";

  const handleSelect = useCallback((code: string | null) => {
    setSelectedCode(code);
    if (!code) {
      setSelectedCountry(null);
    }
  }, []);

  return (
    <div id="world-explorer" className="landing-globe-link landing-reveal landing-reveal--visual">
      <figure className="landing-globe-scene">
        <div className="landing-globe-frame">
          <div className="landing-globe-live">
            <TravelGlobe
              countries={world?.countries ?? EMPTY_COUNTRIES}
              selectedCode={selectedCode}
              routeArcs={routeArcs}
              onSelect={handleSelect}
              onHover={ignoreHover}
              onCountryHover={setHoveredCountry}
              onCountryCenter={setCenteredCountry}
              onCountrySelect={setSelectedCountry}
              mode="world"
            />
          </div>
          <span className="landing-globe-vignette" aria-hidden="true" />

          <header className="landing-world-summary">
          <p className="landing-world-summary__identity">
            <span>{member === undefined ? "불러오는 중" : isOwnWorld ? "내 지구본" : "샘플 지구본"}</span>
            {isOwnWorld ? <strong>{world?.profile.displayName ?? member?.displayName}</strong> : null}
          </p>
          <dl className="landing-world-summary__stats"
            aria-label={worldLabel}
          >
            <GlobeStat label="국가" value={formatStat(statistics?.countryCount)} />
            <GlobeStat label="여행" value={formatStat(statistics?.travelCount)} />
          </dl>
          </header>

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
                    {activeVisit
                      ? `여행 ${activeVisit.travelCount}회 · 도시 ${activeVisit.cityCount}곳`
                      : activeCountry.nameEn}
                  </p>
                </div>
                <div className="min-w-0 max-w-[52%] text-right">
                  <p className="text-content-faint text-[0.58rem] font-semibold tracking-[0.13em] uppercase">
                    대표 장소
                  </p>
                  <p className="text-content-muted mt-1 truncate text-[0.72rem] font-medium">
                    {activePlace.place}
                  </p>
                </div>
                {resolvedSelectedCountry ? (
                  <Link
                    href={profilePath(username)}
                    className="landing-landmark-card__action"
                  >
                    <span>{isOwnWorld ? "내 지구본 보기" : "샘플 프로필 보기"}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : null}
              </>
            ) : (
              <div>
                <p className="text-content text-[0.88rem] font-medium">
                  {landingWorldTitle(member, world, resolvedRequest?.failed ?? false)}
                </p>
                <p className="text-content-faint mt-1 text-[0.68rem]">
                  {landingWorldDescription(member, world, resolvedRequest?.failed ?? false)}
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

function formatStat(value: number | undefined) {
  return value === undefined ? "—" : String(value);
}

function landingWorldTitle(
  member: ReturnType<typeof getCachedAuthMember>,
  world: LandingWorld | null,
  failed: boolean,
) {
  if (failed) return member ? "내 지구본을 불러오지 못했습니다" : "샘플을 불러오지 못했습니다";
  if (member === undefined || !world) return "지구본을 불러오는 중입니다";
  if (member) {
    return world.profile.statistics.travelCount > 0
      ? `${world.profile.displayName}님의 지구본`
      : "아직 기록된 여행이 없습니다";
  }
  return `${world.profile.statistics.countryCount}개 국가 샘플`;
}

function landingWorldDescription(
  member: ReturnType<typeof getCachedAuthMember>,
  world: LandingWorld | null,
  failed: boolean,
) {
  if (failed) return "잠시 후 다시 시도하거나 지구본에서 나라별 랜드마크를 둘러보세요.";
  if (member === undefined || !world) return "로그인 상태와 여행 기록을 불러오는 중입니다.";
  if (member && world.profile.statistics.travelCount === 0) {
    return "첫 여행을 기록하면 지구본에 표시됩니다.";
  }
  return `여행 ${world.profile.statistics.travelCount}개 · 장소 ${world.profile.statistics.placeCount}개`;
}

function GlobeStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
