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
      <section aria-labelledby="globe-heading" className="profile-world">
        <div className="site-shell profile-world__intro">
          <div>
            <p className="eyebrow">Personal world · @{profile.username}</p>
            <h1 id="globe-heading">{profile.displayName}의 여행 지구본</h1>
          </div>
          <p>
            다녀온 {countries.length}개 나라와 {travels.length}번의 여행을 한 세계에 모았습니다.
            지구본을 직접 돌리거나 숫자 마커를 선택해 보세요.
          </p>
        </div>

        <div className="site-shell">
          <div className="profile-globe-card">
            <div className="profile-globe-card__meta" aria-hidden="true">
              <span>LIVE TRAVEL ARCHIVE</span>
              <span>{String(countries.length).padStart(2, "0")} COUNTRIES · {String(profile.statistics.cityCount).padStart(2, "0")} CITIES</span>
            </div>

            <div className="profile-globe-card__canvas">
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

            <div className="profile-globe-card__profile">
              <ProfilePanel profile={profile} />
            </div>

            {selectedCountry ? (
              <div className="profile-globe-card__country">
                <CountryDetailPanel
                  country={selectedCountry}
                  travels={visibleTravels}
                  username={profile.username}
                  onClear={() => handleSelect(null)}
                />
              </div>
            ) : (
              <p className="profile-globe-card__hint" aria-live="polite">
                {hoveredCountry
                  ? `${hoveredCountry.nameKo} · 여행 ${hoveredCountry.travelCount}회`
                  : "ROTATE · SELECT · REMEMBER"}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="site-shell profile-archive">
        <section aria-labelledby="visited-heading" className="profile-country-filter">
          <div>
            <p className="eyebrow">Visited</p>
            <h2 id="visited-heading">방문한 나라</h2>
          </div>
          <CountryKeyboardList
            countries={countries}
            selectedCode={selectedCode}
            onSelect={handleSelect}
            onHover={handleHover}
          />
        </section>

        <section aria-labelledby="travels-heading" className="pt-20">
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
                <span className="text-content-faint font-mono text-[0.7rem] tracking-[0.08em]">
                  {String(travels.length).padStart(2, "0")} JOURNEYS
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
          <section aria-labelledby="timeline-heading" className="pt-28">
            <SectionHeading id="timeline-heading" eyebrow="Chronology" title="여행 연대기" />
            <TravelTimeline travels={travels} username={profile.username} />
          </section>
        ) : null}
      </div>
    </>
  );
}
