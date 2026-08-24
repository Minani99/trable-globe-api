"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { SectionHeading } from "@/components/common/SectionHeading";
import { StateMessage } from "@/components/common/StateMessage";
import { CountryDetailPanel } from "@/components/globe/CountryDetailPanel";
import { CountryKeyboardList } from "@/components/globe/CountryKeyboardList";
import { GlobeMemorySpotlight } from "@/components/globe/GlobeMemorySpotlight";
import { GlobeTimelineControls } from "@/components/globe/GlobeTimelineControls";
import { TravelGlobe } from "@/components/globe/TravelGlobe";
import { ProfileGlobeDock } from "@/components/profile/ProfileGlobeDock";
import { ShareProfileButton } from "@/components/profile/ShareProfileButton";
import { TravelYearFilter } from "@/components/profile/TravelYearFilter";
import { TravelYearRecap } from "@/components/profile/TravelYearRecap";
import { TravelCard } from "@/components/travel/TravelCard";
import { TravelTimeline } from "@/components/travel/TravelTimeline";
import { fetchTravelsByCountry } from "@/lib/api/profile";
import { arcsAtMoment, buildGlobeTimeline, countriesAtMoment, countriesForTravels } from "@/lib/globeTimeline";
import { buildTravelRecap, buildTravelYearComparison, travelsForYear, travelYears } from "@/lib/travelInsights";
import type { AuthMember, FollowStatus, MemberSafetyStatus, TravelSummary, UserProfile, VisitedCountry } from "@/types";

interface ProfileExperienceProps {
  profile: UserProfile;
  countries: VisitedCountry[];
  travels: TravelSummary[];
  viewer: AuthMember | null;
  relationship: FollowStatus | null;
  safetyStatus: MemberSafetyStatus | null;
  initialYear?: number | null;
}

type MobileArchiveView = "travels" | "countries" | "timeline";

/**
 * Owns the shared exploration state for the profile: selected year, moment and country.
 *
 * The globe, filters, detail panel and archive all read and write it, so it lives here
 * rather than in a store - there is one consumer tree and no cross-page persistence.
 */
export function ProfileExperience({
  profile,
  countries,
  travels,
  viewer,
  relationship,
  safetyStatus,
  initialYear = null,
}: ProfileExperienceProps) {
  const years = useMemo(() => travelYears(travels), [travels]);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [centeredCode, setCenteredCode] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(() => (
    initialYear !== null && years.includes(initialYear) ? initialYear : null
  ));
  const scopedTravels = useMemo(
    () => travelsForYear(travels, selectedYear),
    [selectedYear, travels],
  );
  const scopedCountries = useMemo(
    () => selectedYear === null ? countries : countriesForTravels(countries, scopedTravels),
    [countries, scopedTravels, selectedYear],
  );
  const recap = useMemo(
    () => buildTravelRecap(scopedTravels, selectedYear),
    [scopedTravels, selectedYear],
  );
  const yearComparison = useMemo(
    () => buildTravelYearComparison(travels, selectedYear, recap),
    [recap, selectedYear, travels],
  );
  const timeline = useMemo(() => buildGlobeTimeline(scopedTravels), [scopedTravels]);
  const lastMomentIndex = Math.max(0, timeline.moments.length - 1);
  const [timeIndex, setTimeIndex] = useState(lastMomentIndex);
  const [timelineEngaged, setTimelineEngaged] = useState(false);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [timelineControlsExpanded, setTimelineControlsExpanded] = useState(false);
  const [mobileArchiveView, setMobileArchiveView] = useState<MobileArchiveView>("travels");
  // Keyed by the country it was fetched for, so a result arriving after the visitor moved
  // on is simply ignored instead of briefly showing the wrong country's trips.
  const [countryTravels, setCountryTravels] = useState<{
    iso2Code: string;
    travels: TravelSummary[];
  } | null>(null);
  const isOwnProfile = viewer?.username === profile.username;

  useEffect(() => {
    if (!timelinePlaying) return;
    if (timeIndex >= lastMomentIndex) {
      const stopTimer = window.setTimeout(() => setTimelinePlaying(false), 1_250);
      return () => window.clearTimeout(stopTimer);
    }
    const advanceTimer = window.setTimeout(
      () => setTimeIndex((current) => Math.min(lastMomentIndex, current + 1)),
      1_250,
    );
    return () => window.clearTimeout(advanceTimer);
  }, [lastMomentIndex, timeIndex, timelinePlaying]);

  const globeCountries = useMemo(
    () => timelineEngaged ? countriesAtMoment(scopedCountries, timeline, timeIndex) : scopedCountries,
    [scopedCountries, timeIndex, timeline, timelineEngaged],
  );
  const globeArcs = useMemo(
    () => timelineEngaged ? arcsAtMoment(timeline, timeIndex) : timeline.arcs,
    [timeIndex, timeline, timelineEngaged],
  );
  const activeMoment = timeline.moments[timeIndex] ?? null;
  const timelineFocusCode = timelineEngaged ? activeMoment?.focusCode ?? null : null;
  const latestCode = timeline.moments.at(-1)?.focusCode ?? null;

  const selectedCountry = useMemo(
    () => scopedCountries.find((country) => country.iso2Code === selectedCode) ?? null,
    [scopedCountries, selectedCode],
  );

  // Filtering the already-loaded list gives an instant result on click. The dedicated
  // endpoint then confirms it - and becomes the only source once the profile travel list
  // is paginated. If that request fails the locally filtered view simply stays.
  const locallyFiltered = useMemo(() => {
    if (!selectedCode) {
      return scopedTravels;
    }
    return scopedTravels.filter((travel) =>
      travel.countries.some((country) => country.iso2Code === selectedCode),
    );
  }, [scopedTravels, selectedCode]);

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
  const confirmedScopedTravels = confirmedTravels
    ? travelsForYear(confirmedTravels, selectedYear)
    : null;
  const visibleTravels = selectedCode
    ? (confirmedScopedTravels ?? locallyFiltered)
    : scopedTravels;

  const handleSelect = useCallback((iso2Code: string | null) => {
    if (iso2Code) {
      setTimelinePlaying(false);
      setTimelineEngaged(false);
      setTimelineControlsExpanded(false);
      setTimeIndex(lastMomentIndex);
    }
    setSelectedCode(iso2Code);
  }, [lastMomentIndex]);

  const handleHover = useCallback((iso2Code: string | null) => {
    setHoveredCode(iso2Code);
  }, []);

  const handleCountryCenter = useCallback((country: { code: string } | null) => {
    setCenteredCode(country?.code ?? null);
  }, []);

  const hoveredCountry = scopedCountries.find((country) => country.iso2Code === hoveredCode) ?? null;
  const spotlightCode = selectedCode === null
    ? (timelineFocusCode ?? centeredCode)
    : null;
  const spotlightCountry = globeCountries.find((country) => country.iso2Code === spotlightCode) ?? null;
  const timelineVisibleTravels = timelineEngaged
    ? timeline.travels.slice(0, timeIndex + 1)
    : timeline.travels;
  const spotlightTravel = spotlightCode
    ? [...timelineVisibleTravels].reverse().find((travel) => (
        travel.countries.some((country) => country.iso2Code === spotlightCode)
      )) ?? null
    : null;

  const handleTimelineIndex = useCallback((index: number) => {
    setSelectedCode(null);
    setTimelinePlaying(false);
    setTimelineEngaged(true);
    setTimeIndex(index);
  }, []);

  const toggleTimelinePlaying = useCallback(() => {
    if (timelinePlaying) {
      setTimelinePlaying(false);
      return;
    }
    setSelectedCode(null);
    setTimelineEngaged(true);
    if (timeIndex >= lastMomentIndex) setTimeIndex(0);
    setTimelinePlaying(true);
  }, [lastMomentIndex, timeIndex, timelinePlaying]);

  const showPresentWorld = useCallback(() => {
    setTimelinePlaying(false);
    setTimelineEngaged(false);
    setTimeIndex(lastMomentIndex);
    setSelectedCode(null);
  }, [lastMomentIndex]);

  const handleYearChange = useCallback((year: number | null) => {
    const nextTravels = travelsForYear(travels, year);
    const url = new URL(window.location.href);
    if (year === null) {
      url.searchParams.delete("year");
    } else {
      url.searchParams.set("year", String(year));
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    setSelectedYear(year);
    setSelectedCode(null);
    setHoveredCode(null);
    setCenteredCode(null);
    setTimelinePlaying(false);
    setTimelineEngaged(false);
    setTimelineControlsExpanded(false);
    setMobileArchiveView("travels");
    setTimeIndex(Math.max(0, nextTravels.length - 1));
  }, [travels]);

  const showCountryIndex = scopedCountries.length > 1;
  const showTravelTimeline = scopedTravels.length > 1;
  const mobileArchivePanelCount = 1 + Number(showCountryIndex) + Number(showTravelTimeline);

  return (
    <>
      <section aria-labelledby="globe-heading" className="profile-world">
        <div className="site-shell profile-world__intro">
          <div>
            <p className="eyebrow">Personal world · @{profile.username}</p>
            <h1 id="globe-heading">{profile.displayName}의 여행 세계</h1>
          </div>
          <div className="profile-world__summary">
            <p>
              {selectedYear
                ? `${selectedYear}년에 다녀온 ${recap.countryCount}개 나라와 ${recap.travelCount}번의 여행입니다.`
                : `${countries.length}개 나라, ${travels.length}번의 여행이 하나의 지구본 위에 이어집니다.`}
              {" "}재생 버튼으로 세계가 확장된 시간을 따라가거나 나라를 선택해
              그곳에 쌓인 기억을 살펴보세요.
            </p>
            <ShareProfileButton displayName={profile.displayName} selectedYear={selectedYear} />
          </div>
        </div>

        <div className="site-shell">
          <TravelYearFilter years={years} selectedYear={selectedYear} onChange={handleYearChange} />
          <div className={`profile-globe-card${timelineControlsExpanded ? " has-expanded-timeline" : ""}`}>
            <div className="profile-globe-card__meta" aria-hidden="true">
              <span>TRAVEL GLOBE · LIVE ARCHIVE</span>
              <span>
                {String(globeCountries.length).padStart(2, "0")} COUNTRIES
                {timelineEngaged && activeMoment
                  ? ` · ${activeMoment.year}`
                  : ` · ${String(selectedYear ? recap.cityCount : profile.statistics.cityCount).padStart(2, "0")} CITIES`}
              </span>
            </div>

            <div className="profile-globe-card__canvas">
              {scopedCountries.length > 0 ? (
                <TravelGlobe
                  countries={globeCountries}
                  selectedCode={selectedCode}
                  focusCode={timelineFocusCode}
                  recentCode={timelineFocusCode ?? latestCode}
                  routeArcs={globeArcs}
                  onSelect={handleSelect}
                  onHover={handleHover}
                  onCountryCenter={handleCountryCenter}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6">
                  <StateMessage
                    eyebrow="기록 전"
                    title="아직 여행 기록이 없습니다"
                    description="첫 여행을 기록하면 이곳에 새로운 나라가 표시됩니다."
                    action={isOwnProfile
                      ? { href: "/studio/travels/new", label: "첫 여행 기록하기" }
                      : undefined}
                  />
                </div>
              )}

              {scopedCountries.length > 0 && timeline.moments.length > 0 ? (
                <GlobeTimelineControls
                  moments={timeline.moments}
                  activeIndex={timeIndex}
                  playing={timelinePlaying}
                  engaged={timelineEngaged}
                  expanded={timelineControlsExpanded}
                  onIndexChange={handleTimelineIndex}
                  onTogglePlaying={toggleTimelinePlaying}
                  onPresent={showPresentWorld}
                  onExpandedChange={setTimelineControlsExpanded}
                  presentLabel={selectedYear ? `${selectedYear} 전체` : "현재"}
                />
              ) : null}

              {spotlightCountry && !timelineControlsExpanded ? (
                <GlobeMemorySpotlight
                  country={spotlightCountry}
                  travel={spotlightTravel}
                  timelineActive={timelineEngaged}
                  onSelect={() => handleSelect(spotlightCountry.iso2Code)}
                />
              ) : null}
            </div>

            <div className="profile-globe-card__profile">
              <ProfileGlobeDock
                profile={profile}
                isOwnProfile={isOwnProfile}
                viewerAuthenticated={Boolean(viewer)}
                initialFollowing={relationship?.following ?? false}
                initialSafetyStatus={safetyStatus}
              />
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
                  : "재생하고 · 돌려보고 · 기억 열기"}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="site-shell profile-archive">
        <TravelYearRecap
          recap={recap}
          comparison={yearComparison}
          username={profile.username}
          displayName={profile.displayName}
        />

        {mobileArchivePanelCount > 1 ? (
          <nav className="profile-archive__mobile-nav" aria-label="프로필 기록 보기">
            <button
              type="button"
              className={mobileArchiveView === "travels" ? "is-active" : undefined}
              aria-pressed={mobileArchiveView === "travels"}
              aria-controls="profile-travel-archive"
              onClick={() => setMobileArchiveView("travels")}
            >
              기록 <span>{scopedTravels.length}</span>
            </button>
            {showCountryIndex ? (
              <button
                type="button"
                className={mobileArchiveView === "countries" ? "is-active" : undefined}
                aria-pressed={mobileArchiveView === "countries"}
                aria-controls="profile-country-index"
                onClick={() => setMobileArchiveView("countries")}
              >
                나라 <span>{scopedCountries.length}</span>
              </button>
            ) : null}
            {showTravelTimeline ? (
              <button
                type="button"
                className={mobileArchiveView === "timeline" ? "is-active" : undefined}
                aria-pressed={mobileArchiveView === "timeline"}
                aria-controls="profile-travel-timeline"
                onClick={() => setMobileArchiveView("timeline")}
              >
                연도 <span>{years.length}</span>
              </button>
            ) : null}
          </nav>
        ) : null}

        {showCountryIndex ? (
          <section
            id="profile-country-index"
            aria-labelledby="visited-heading"
            className={`profile-country-filter profile-archive__panel${mobileArchiveView === "countries" ? " is-mobile-active" : ""}`}
          >
            <div>
              <p className="eyebrow">Country index</p>
              <h2 id="visited-heading">{selectedYear ? `${selectedYear}년에 방문한 나라` : "방문한 나라"}</h2>
            </div>
            <CountryKeyboardList
              countries={scopedCountries}
              selectedCode={selectedCode}
              onSelect={handleSelect}
              onHover={handleHover}
            />
          </section>
        ) : null}

        <section
          id="profile-travel-archive"
          aria-labelledby="travels-heading"
          className={`profile-travel-section profile-archive__panel${mobileArchiveView === "travels" ? " is-mobile-active" : ""}`}
        >
          <SectionHeading
            id="travels-heading"
            eyebrow="Travel archive"
            title={selectedCountry
              ? `${selectedCountry.nameKo}에서의 여행`
              : selectedYear ? `${selectedYear}년 여행 기록` : "여행 기록"}
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
                  여행 {String(scopedTravels.length).padStart(2, "0")}개
                </span>
              )
            }
          />

          <p aria-live="polite" className="sr-only">
            {selectedCountry
              ? `${selectedCountry.nameKo} 여행 ${visibleTravels.length}건을 표시합니다.`
              : `${selectedYear ? `${selectedYear}년` : "전체"} 여행 ${scopedTravels.length}건을 표시합니다.`}
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
              title={selectedCountry ? `${selectedCountry.nameKo} 여행 기록이 없습니다` : "아직 여행 기록이 없습니다"}
              description={
                selectedCountry
                  ? "필터를 해제하면 다른 나라의 여행도 확인할 수 있습니다."
                  : "첫 여행을 기록하면 이곳에 여행 카드가 표시됩니다."
              }
              action={isOwnProfile
                ? {
                    href: selectedCountry
                      ? `/studio/travels/new?country=${encodeURIComponent(selectedCountry.iso2Code)}`
                      : "/studio/travels/new",
                    label: selectedCountry ? `${selectedCountry.nameKo} 여행 기록하기` : "첫 여행 기록하기",
                  }
                : undefined}
            />
          )}
        </section>

        {showTravelTimeline ? (
          <section
            id="profile-travel-timeline"
            aria-labelledby="timeline-heading"
            className={`profile-timeline-section profile-archive__panel${mobileArchiveView === "timeline" ? " is-mobile-active" : ""}`}
          >
            <SectionHeading id="timeline-heading" eyebrow="By year" title="시간순 여행 기록" />
            <TravelTimeline travels={scopedTravels} username={profile.username} />
          </section>
        ) : null}
      </div>
    </>
  );
}
