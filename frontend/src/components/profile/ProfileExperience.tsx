"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/common/SectionHeading";
import { StateMessage } from "@/components/common/StateMessage";
import { CountryDetailPanel } from "@/components/globe/CountryDetailPanel";
import { CountryKeyboardList } from "@/components/globe/CountryKeyboardList";
import { TravelGlobe } from "@/components/globe/TravelGlobe";
import { ProfilePanel } from "@/components/profile/ProfilePanel";
import { TravelCard } from "@/components/travel/TravelCard";
import { TravelTimeline } from "@/components/travel/TravelTimeline";
import { fetchTravelsByCountry } from "@/lib/api/profile";
import type { TravelSummary, UserProfile, VisitedCountry } from "@/types";

interface ProfileExperienceProps {
  profile: UserProfile;
  countries: VisitedCountry[];
  travels: TravelSummary[];
}

/**
 * Owns the one piece of state the whole profile page turns on: which country is selected.
 *
 * The globe, the country chips, the detail panel and the card grid all read and write it,
 * so it lives here rather than in a store - there is exactly one consumer tree and no
 * cross-page persistence to justify a state library.
 */
export function ProfileExperience({ profile, countries, travels }: ProfileExperienceProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  // Keyed by the country it was fetched for, so a result arriving after the visitor moved
  // on is simply ignored instead of briefly showing the wrong country's trips.
  const [countryTravels, setCountryTravels] = useState<{
    iso2Code: string;
    travels: TravelSummary[];
  } | null>(null);

  const selectedCountry = useMemo(
    () => countries.find((country) => country.iso2Code === selectedCode) ?? null,
    [countries, selectedCode],
  );

  // Filtering the already-loaded list gives an instant result on click. The dedicated
  // endpoint then confirms it - and becomes the only source once the profile travel list
  // is paginated. If that request fails the locally filtered view simply stays.
  const locallyFiltered = useMemo(() => {
    if (!selectedCode) {
      return travels;
    }
    return travels.filter((travel) =>
      travel.countries.some((country) => country.iso2Code === selectedCode),
    );
  }, [travels, selectedCode]);

  useEffect(() => {
    if (!selectedCode) {
      return;
    }
    let cancelled = false;

    fetchTravelsByCountry(profile.username, selectedCode)
      .then((result) => {
        if (!cancelled) {
          setCountryTravels({ iso2Code: selectedCode, travels: result });
        }
      })
      // Leaving the locally filtered list in place is the right failure mode here.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedCode, profile.username]);

  const confirmedTravels =
    countryTravels && countryTravels.iso2Code === selectedCode ? countryTravels.travels : null;
  const visibleTravels = selectedCode ? (confirmedTravels ?? locallyFiltered) : travels;

  const handleSelect = useCallback((iso2Code: string | null) => {
    setSelectedCode(iso2Code);
  }, []);

  const handleHover = useCallback((iso2Code: string | null) => {
    setHoveredCode(iso2Code);
  }, []);

  const hoveredCountry = countries.find((country) => country.iso2Code === hoveredCode) ?? null;

  return (
    <>
      {/* Globe stage: the first thing on the page, tall enough to be the subject. */}
      <section
        aria-labelledby="globe-heading"
        className="relative w-full lg:h-[calc(100vh-3.5rem)] lg:max-h-[820px] lg:min-h-[580px]"
      >
        <h2 id="globe-heading" className="sr-only">
          {profile.displayName}님의 여행 지구본
        </h2>

        {/* On a phone the globe keeps its own block so nothing can cover it; from lg up
            it fills the stage and the panels float over it. */}
        <div className="h-[52vh] max-h-[560px] min-h-[340px] w-full lg:absolute lg:inset-0 lg:h-full lg:max-h-none">
          {countries.length > 0 ? (
            <TravelGlobe
              countries={countries}
              selectedCode={selectedCode}
              onSelect={handleSelect}
              onHover={handleHover}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <StateMessage
                eyebrow="Empty globe"
                title="아직 기록된 여행이 없습니다"
                description={"첫 번째 여행이 기록되면\n이곳에 새로운 나라가 표시됩니다."}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 px-5 py-5 sm:px-8 lg:pointer-events-none lg:absolute lg:inset-0 lg:justify-between lg:p-6">
          <div className="lg:pointer-events-auto lg:self-end">
            <ProfilePanel profile={profile} />
          </div>

          {selectedCountry ? (
            <div className="lg:pointer-events-auto lg:self-start">
              <CountryDetailPanel
                country={selectedCountry}
                travels={visibleTravels}
                username={profile.username}
                onClear={() => handleSelect(null)}
              />
            </div>
          ) : (
            <p className="text-content-faint hidden text-[0.75rem] lg:block" aria-hidden="true">
              {hoveredCountry
                ? `${hoveredCountry.nameKo} · 여행 ${hoveredCountry.travelCount}회`
                : "지구본을 돌려보거나 마커를 선택해 보세요"}
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto w-full max-w-[1400px] px-5 sm:px-8">
        <div className="hairline py-6">
          <p className="eyebrow mb-3">Visited</p>
          <CountryKeyboardList
            countries={countries}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            onHover={handleHover}
          />
        </div>

        <section aria-labelledby="travels-heading" className="pt-12">
          <SectionHeading
            id="travels-heading"
            eyebrow="Archive"
            title={selectedCountry ? `${selectedCountry.nameKo}에서의 여행` : "여행 기록"}
            aside={
              selectedCountry ? (
                <button
                  type="button"
                  onClick={() => handleSelect(null)}
                  className="border-border-strong text-content-muted rounded-full border px-3 py-1.5 text-[0.76rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
                >
                  필터 해제
                </button>
              ) : (
                <span className="text-content-faint font-mono text-[0.78rem]">
                  {travels.length} trips
                </span>
              )
            }
          />

          <p aria-live="polite" className="sr-only">
            {selectedCountry
              ? `${selectedCountry.nameKo} 여행 ${visibleTravels.length}건을 표시합니다.`
              : `전체 여행 ${travels.length}건을 표시합니다.`}
          </p>

          {visibleTravels.length > 0 ? (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {visibleTravels.map((travel, index) => (
                <TravelCard
                  key={travel.id}
                  travel={travel}
                  username={profile.username}
                  priority={index === 0}
                />
              ))}
            </div>
          ) : (
            <StateMessage
              title="아직 기록된 여행이 없습니다"
              description={"첫 번째 여행이 기록되면\n이곳에 카드가 표시됩니다."}
            />
          )}
        </section>

        {travels.length > 0 ? (
          <section aria-labelledby="timeline-heading" className="pt-20">
            <SectionHeading id="timeline-heading" eyebrow="Chronology" title="여행 연대기" />
            <TravelTimeline travels={travels} username={profile.username} />
          </section>
        ) : null}
      </div>
    </>
  );
}
