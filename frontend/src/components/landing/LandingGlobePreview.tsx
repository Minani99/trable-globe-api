"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { TravelGlobe, type GlobeCountryHover } from "@/components/globe/TravelGlobe";
import {
  getCachedAuthMember,
  loadAuthMember,
  subscribeToAuthState,
} from "@/lib/auth-state";
import { countryFlag, getWorldLandmarkPlace } from "@/lib/worldLandmarks";
import type { AuthMember } from "@/types";

export function LandingGlobePreview() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<GlobeCountryHover | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<GlobeCountryHover | null>(null);
  const [centeredCountry, setCenteredCountry] = useState<GlobeCountryHover | null>(null);
  const [member, setMember] = useState<AuthMember | null | undefined>(() => getCachedAuthMember());
  const activeCountry = selectedCountry ?? hoveredCountry ?? centeredCountry;
  const activePlace = activeCountry ? getWorldLandmarkPlace(activeCountry.code) : null;

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(setMember);
    if (getCachedAuthMember() === undefined) void loadAuthMember();
    return unsubscribe;
  }, []);

  const handleSelect = (code: string | null) => {
    setSelectedCode(code);
  };

  return (
    <div id="world-explorer" className="landing-globe-link landing-reveal landing-reveal--visual">
      <figure className="landing-globe-scene">
        <div className="landing-globe-frame">
          <div className="landing-globe-live">
            <TravelGlobe
              countries={[]}
              selectedCode={selectedCode}
              onSelect={handleSelect}
              onHover={() => undefined}
              onCountryHover={setHoveredCountry}
              onCountryCenter={setCenteredCountry}
              onCountrySelect={setSelectedCountry}
              mode="world"
            />
          </div>
          <span className="landing-globe-vignette" aria-hidden="true" />

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
                {selectedCountry && member !== undefined ? (
                  <Link
                    href={countryActionHref(selectedCountry.code, Boolean(member))}
                    className="landing-landmark-card__action"
                  >
                    <span>
                      {member
                        ? `${selectedCountry.nameKo} 여행 기록하기`
                        : "내 지구본에 이 나라 추가"}
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : selectedCountry ? (
                  <span className="landing-landmark-card__action is-loading" aria-label="계정 상태 확인 중">
                    계정 상태 확인 중…
                  </span>
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

function countryActionHref(code: string, authenticated: boolean): string {
  const editorCode = code === "Kosovo" ? "XK" : code === "N. Cyprus" ? "CY" : code === "Somaliland" ? "SO" : code;
  const destination = `/studio/travels/new?country=${encodeURIComponent(editorCode)}`;
  return authenticated ? destination : `/register?next=${encodeURIComponent(destination)}`;
}
