"use client";

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import type { TravelDetail, TravelPlaceWriteInput, TravelWriteInput } from "@/types";
import { Icon } from "@/components/common/Icon";
import {
  addDays,
  ANCHOR_MODES,
  BUILD_MODES,
  buildAutomaticPlaces,
  buildSkeletonPlaces,
  COMPANIONS,
  DURATION_PRESETS,
  DOMESTIC_REGIONS,
  fetchPlanRecommendations,
  formatDuration,
  formatPlanDate,
  formatPlanDateLong,
  MAX_TRIP_DAYS,
  MOBILE_PLAN_STEPS,
  PACES,
  POPULAR_COUNTRIES,
  resolvePlanAnchor,
  SCHEDULES,
  SLOT_LABEL,
  STYLES,
  type Style,
} from "@/components/planner/plan-builder-model";

import { createPlanDraftStore, writePlanDraft } from "./plan-draft";

interface PlanBuilderProps {
  countries: CountryOption[];
  today: string;
  initialCountryCode?: string;
  username: string;
}

export function PlanBuilder(props: PlanBuilderProps) {
  const [revision, setRevision] = useState(0);
  const draftKey = `plan-setup.v1:${encodeURIComponent(props.username)}:${props.initialCountryCode || "default"}`;
  function resetDraft() {
    if (!window.confirm("이 탭에서 작성하던 계획을 지우고 새로 시작할까요?")) return;
    writePlanDraft(draftKey, null);
    setRevision(value => value + 1);
  }
  return <PlanForm key={`${draftKey}:${revision}`} {...props} draftKey={draftKey} onReset={resetDraft} />;
}

function PlanForm({
  countries,
  today,
  initialCountryCode = "",
  draftKey, onReset,
}: PlanBuilderProps & { draftKey: string; onReset: () => void }) {

  const router = useRouter();
  const countryMap = useMemo(
    () => new Map(countries.map((country) => [country.iso2Code, country])),
    [countries],
  );
  const popularCountries = POPULAR_COUNTRIES
    .map((code) => countryMap.get(code))
    .filter((country): country is CountryOption => Boolean(country));

  const [draftStore] = useState(() => createPlanDraftStore(draftKey, {
    countryCode: initialCountryCode || "KR", region: "", startDate: today,
    tripDays: !initialCountryCode || initialCountryCode === "KR" ? 2 : 4,
    companion: "친구와", styles: ["맛집", "여유"], pace: "balanced",
    buildMode: "skeleton", anchorMode: "center", anchorInput: "", mobileStep: 0,
  }));
  const { fields, restored } = useSyncExternalStore(draftStore.subscribe, draftStore.getSnapshot, draftStore.getServerSnapshot);
  const { countryCode, region, startDate, tripDays, companion, styles, pace, buildMode, anchorMode, anchorInput, mobileStep } = fields;
  const domestic = countryCode === "KR";
  const [countryQuery, setCountryQuery] = useState("");
  const [resultIndex, setResultIndex] = useState(-1);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const resultsOpen = Boolean(countryQuery.trim()) && !resultsDismissed;
  const [editingFromSummary, setEditingFromSummary] = useState(false);
  const summaryStep = MOBILE_PLAN_STEPS.length - 1;
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("계획 만드는 중…");
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<HTMLElement>(null);
  const countrySearchId = useId();
  const regionRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLInputElement>(null);
  const countrySearchRef = useRef<HTMLInputElement>(null);

  const creationLock = useRef(false);

  const selectedCountry = countryMap.get(countryCode);
  const endDate = addDays(startDate, tripDays - 1);
  const activeAnchor = ANCHOR_MODES.find((item) => item.id === anchorMode) ?? ANCHOR_MODES[0];
  const activePace = PACES.find((item) => item.id === pace) ?? PACES[1];
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [anchorInput.trim() || (domestic ? region.trim() : ""), selectedCountry?.nameEn].filter(Boolean).join(" ") || "travel places",
  )}`;

  const countryResults = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    if (!query) return [];
    return countries
      .filter((country) =>
        country.nameKo.toLowerCase().includes(query)
        || country.nameEn.toLowerCase().includes(query)
        || country.iso2Code.toLowerCase() === query
        || country.iso3Code.toLowerCase() === query)
      .slice(0, 8);
  }, [countries, countryQuery]);

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(null), 6000);
    return () => window.clearTimeout(timer);
  }, [error]);

  function chooseCountry(code: string) {
    setResultIndex(-1);
    draftStore.update({ countryCode: code, anchorInput: "" });
    setCountryQuery("");
    setError(null);
  }

  function toggleStyle(style: Style) {
    draftStore.update({ styles: styles.includes(style)
      ? styles.filter(item => item !== style)
      : styles.length < 3 ? [...styles, style] : styles });
  }

  function changeTripDays(next: number) {
    draftStore.update({ tripDays: Math.max(1, Math.min(MAX_TRIP_DAYS, next)) });
  }

  function validateStep(step: number): boolean {
    function showError(message: string, input: HTMLInputElement | null) {
      flushSync(() => {
        draftStore.update({ mobileStep: step });
        setError(message);
      });
      input?.focus();
      return false;
    }

    if (step === 0 && domestic && region.trim().length < 2) {
      return showError("여행할 도시·지역을 입력해 주세요.", regionRef.current);
    }
    if (step === 0 && !selectedCountry) {
      return showError("여행할 나라를 먼저 골라 주세요.", countrySearchRef.current);
    }
    if (step === 0 && (!startDate || startDate < today)) {
      return showError(startDate ? "출발일은 오늘 이후로 선택해 주세요." : "출발일을 선택해 주세요.", dateRef.current);
    }
    if (step === 1 && buildMode === "auto" && anchorMode !== "center" && anchorInput.trim().length < 2) {
      return showError(anchorMode === "stay" ? "동선의 기준이 될 숙소를 입력해 주세요." : "반드시 갈 장소를 입력해 주세요.", anchorRef.current);
    }
    return true;
  }

  function moveMobileStep(nextStep: number, fromSummary = false) {
    for (let step = mobileStep; step < nextStep; step++) {
      if (!validateStep(step)) return;
    }
    setEditingFromSummary(fromSummary);
    draftStore.update({ mobileStep: nextStep });
    setError(null);
    window.requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
    });
  }

  async function createPlan() {
    for (const step of [0, 1]) {
      if (!validateStep(step)) return;
    }
    if (!selectedCountry || creationLock.current) return;

    creationLock.current = true;
    setPending(true);
    setError(null);
    setPendingLabel(buildMode === "auto" ? "기준 위치 찾는 중…" : "계획 만드는 중…");

    try {
      let places: TravelPlaceWriteInput[];
      let recommendationCount = 0;
      if (buildMode === "auto") {
        const anchor = await resolvePlanAnchor(selectedCountry, anchorMode, anchorInput.trim() || (domestic ? region : ""), domestic && anchorMode === "center", domestic ? region.trim() : "");
        setPendingLabel("주변 장소와 동선 찾는 중…");
        const recommendations = await fetchPlanRecommendations(anchor, styles, companion);
        const generated = buildAutomaticPlaces({
          selectedCountry,
          anchor,
          recommendations,
          pace,
          tripDays,
          startDate,
          styles,
        });
        places = generated.places;
        recommendationCount = generated.recommendationCount;
      } else {
        places = buildSkeletonPlaces(selectedCountry, tripDays, startDate, styles, activePace.label);
        if (domestic) {
          setPendingLabel("여행 지역 확인 중…");
          const anchor = await resolvePlanAnchor(selectedCountry, "center", region, true);
          places = places.map(place => ({ ...place, latitude: anchor.latitude, longitude: anchor.longitude,
            city: { nameKo: region.trim(), nameEn: anchor.city || region.trim(), latitude: anchor.latitude, longitude: anchor.longitude } }));
        }
      }

      setPendingLabel("내 계획으로 저장하는 중…");
      const payload: TravelWriteInput = {
        title: `${domestic ? region.trim() : selectedCountry.nameKo} ${tripDays}일 여행`,
        description: `${companion} 떠나는 ${styles.join(" · ") || "자유로운"} 여행 · ${activePace.label}`,
        startDate,
        endDate,
        coverImageUrl: null,
        visibility: "PRIVATE",
        places,
        photos: [],
      };
      const result = await apiMutation<TravelDetail>("/api/private/travels", "POST", payload);
      if (!result) throw new ApiError(500, "만든 계획을 확인할 수 없습니다.");
      writePlanDraft(draftKey, null);
      showFeedback(
        buildMode === "auto"
          ? recommendationCount > 0
            ? `${recommendationCount}곳을 시간대별로 배치했습니다. 마음에 맞게 바꿔보세요.`
            : "시간표 초안을 만들었습니다. 추천이 비어 있는 칸은 직접 골라주세요."
          : "일차별 여행 계획을 만들었습니다. 장소만 골라 채워보세요.",
        "success",
      );
      router.push(`/studio/travels/${result.id}/edit?plan=1`);
      router.refresh();
    } catch (cause) {
      creationLock.current = false;
      setError(cause instanceof ApiError ? cause.message : "여행 계획을 만들지 못했습니다.");
      setPending(false);
    }
  }

  const submitLabel = buildMode === "auto" ? "자동 일정 만들기" : "일정 만들기";
  const progress = ((mobileStep + 1) / MOBILE_PLAN_STEPS.length) * 100;

  return (
    <div className="plan-builder pb" data-step={mobileStep}>
      {restored && <div className="pb-restored"><span>이 탭에서 작성하던 계획을 불러왔어요.</span><button type="button" className="pb-ghost" disabled={pending} onClick={onReset}>새로 작성</button></div>}
      {/* Mobile progress ------------------------------------------------ */}
      <header ref={progressRef} id="mobile-plan-progress" className="pb-progress">
        <div className="pb-progress__row">
          <span className="pb-progress__count">{mobileStep + 1} / {MOBILE_PLAN_STEPS.length}</span>
          <strong>{MOBILE_PLAN_STEPS[mobileStep]}</strong>
        </div>
        <span
          className="pb-progress__track"
          role="progressbar"
          aria-label="여행 계획 작성 진행률"
          aria-valuemin={1}
          aria-valuemax={MOBILE_PLAN_STEPS.length}
          aria-valuenow={mobileStep + 1}
        >
          <i style={{ width: `${progress}%` }} />
        </span>
      </header>

      {/* Form ------------------------------------------------------------ */}
      <div className="pb-form" inert={pending}>
        {/* 01 Country */}
        <section className="pb-step" data-mobile-active={mobileStep === 0} aria-labelledby="plan-country-heading">
          <h2 id="plan-country-heading" className="pb-section-title">여행지</h2>
          <div className="pb-segment pb-destination-scope" role="group" aria-label="여행 범위">
            <button type="button" aria-pressed={domestic} className={domestic ? "is-selected" : ""} onClick={() => { if (!domestic) chooseCountry("KR"); }}>국내여행</button>
            <button type="button" aria-pressed={!domestic} className={!domestic ? "is-selected" : ""} onClick={() => { if (domestic) chooseCountry(""); }}>해외여행</button>
          </div>

          {domestic ? <div className="pb-group">
            <label className="pb-field"><span className="pb-field__label">여행할 도시·지역</span><input ref={regionRef} value={region} onChange={event => { draftStore.update({ region: event.target.value }); setError(null); }} placeholder="예: 강릉, 제주 서귀포, 가평" maxLength={80} /></label>
            <div className="pb-chip-row" role="group" aria-label="국내 여행지 빠른 선택">{DOMESTIC_REGIONS.map(item => <button type="button" key={item} className={`pb-chip${region === item ? " is-selected" : ""}`} aria-pressed={region === item} onClick={() => { draftStore.update({ region: item }); setError(null); }}>{item}</button>)}</div>
          </div> : selectedCountry ? (
            <div className="pb-selected-country">
              <Flag code={selectedCountry.iso2Code} size="lg" />
              <div>
                <strong>{selectedCountry.nameKo}</strong>
                <span>{selectedCountry.nameEn} · {selectedCountry.iso2Code}</span>
              </div>
              <button type="button" className="pb-ghost" onClick={() => {
                flushSync(() => { draftStore.update({ countryCode: "" }); setCountryQuery(""); });
                countrySearchRef.current?.focus();
              }}>변경</button>
            </div>
          ) : (
            <>
              <div className="pb-country-search">
                <label className="pb-field pb-field--search">
                  <span className="sr-only">여행할 나라 검색</span>
                  <SearchIcon />
                  <input
                    id={countrySearchId}
                    ref={countrySearchRef}
                    value={countryQuery}
                    onChange={(event) => { setCountryQuery(event.target.value); setResultsDismissed(false); setResultIndex(-1); setError(null); }}
                    onClick={() => setResultsDismissed(false)}
                    enterKeyHint="go"
                    onKeyDown={(event) => {
                      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
                      if (event.key === "Escape" && resultsOpen) {
                        event.preventDefault();
                        setResultsDismissed(true);
                        setResultIndex(-1);
                        return;
                      }
                      if (countryResults.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                        event.preventDefault();
                        if (resultsDismissed) flushSync(() => setResultsDismissed(false));
                        const last = countryResults.length - 1;
                        const next = event.key === "ArrowDown" ? Math.min(resultIndex + 1, last) : resultIndex < 0 ? last : Math.max(resultIndex - 1, 0);
                        setResultIndex(next);
                        document.getElementById(`${countrySearchId}-option-${next}`)?.scrollIntoView({ block: "nearest" });
                        return;
                      }
                      if (event.key !== "Enter") return;
                      const query = countryQuery.trim().toLowerCase();
                      const match = countryResults[resultIndex] ?? countries.find(country =>
                        [country.nameKo, country.nameEn, country.iso2Code, country.iso3Code]
                          .some(value => value.toLowerCase() === query));
                      if (match) {
                        event.preventDefault();
                        chooseCountry(match.iso2Code);
                      }
                    }}
                    placeholder="나라 이름으로 검색 (예: 일본, Japan)"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={resultsOpen}
                    aria-controls={resultsOpen ? `${countrySearchId}-results` : undefined}
                    aria-autocomplete="list"
                    aria-activedescendant={countryResults[resultIndex] ? `${countrySearchId}-option-${resultIndex}` : undefined}
                  />
                </label>
                {countryQuery.trim() && (
                  <button type="button" className="pb-ghost pb-results-toggle"
                    aria-expanded={resultsOpen}
                    aria-controls={resultsOpen ? `${countrySearchId}-results` : undefined}
                    onClick={() => { setResultsDismissed(resultsOpen); setResultIndex(-1); }}>
                    {resultsOpen ? "목록 닫기" : "목록 열기"}
                  </button>
                )}
                {resultsOpen ? (
                  <ul id={`${countrySearchId}-results`} className="pb-country-results" role="listbox" aria-label="검색 결과">
                    {countryResults.length === 0 ? (
                      <li className="pb-country-results__empty">검색 결과가 없어요. 영문 이름으로도 찾아보세요.</li>
                    ) : countryResults.map((country, index) => (
                      <li key={country.iso2Code} id={`${countrySearchId}-option-${index}`} role="option" aria-selected={index === resultIndex}>
                        <button type="button" onClick={() => chooseCountry(country.iso2Code)}>
                          <Flag code={country.iso2Code} />
                          <span className="pb-country-results__name">{country.nameKo}</span>
                          <span className="pb-country-results__meta">{country.nameEn}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {!countryQuery.trim() && <div className="pb-group">
                <span className="pb-group__label">자주 찾는 여행지</span>
                <div className="pb-country-grid" aria-label="인기 여행지">
                  {popularCountries.map((country) => (
                    <button
                      key={country.iso2Code}
                      type="button"
                      className="pb-country-tile"
                      onClick={() => chooseCountry(country.iso2Code)}
                    >
                      <Flag code={country.iso2Code} />
                      <span>{country.nameKo}</span>
                    </button>
                  ))}
                </div>
              </div>}
            </>
          )}
        </section>

        {/* 02 Dates */}
        <section className="pb-step" data-mobile-active={mobileStep === 0} aria-labelledby="plan-date-heading">
          <h2 id="plan-date-heading" className="pb-section-title">여행 날짜</h2>
          <div className="pb-date-grid">
            <label className="pb-field">
              <span className="pb-field__label">출발일</span>
              <input
                type="date"
                min={today}
                ref={dateRef}
                value={startDate}
                onChange={(event) => { draftStore.update({ startDate: event.target.value }); setError(null); }}
              />
            </label>
            <div className="pb-field">
              <span className="pb-field__label">기간</span>
              <div className="pb-stepper" role="group" aria-label="여행 기간 조절">
                <button type="button" onClick={() => changeTripDays(tripDays - 1)} disabled={tripDays <= 1} aria-label="하루 줄이기"><Icon name="minus" /></button>
                <output aria-live="polite">{formatDuration(tripDays)}</output>
                <button type="button" onClick={() => changeTripDays(tripDays + 1)} disabled={tripDays >= MAX_TRIP_DAYS} aria-label="하루 늘리기"><Icon name="plus" /></button>
              </div>
            </div>
          </div>
          <div className="pb-chip-row" aria-label="기간 빠른 선택">
            {DURATION_PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                className={`pb-chip${tripDays === days ? " is-selected" : ""}`}
                aria-pressed={tripDays === days}
                onClick={() => changeTripDays(days)}
              >
                {formatDuration(days)}
              </button>
            ))}
          </div>
          {startDate ? (
            <p className="pb-note">
              <CalendarIcon />
              <span>{tripDays === 1 ? `${formatPlanDateLong(startDate)} 당일 여행` : `${formatPlanDateLong(startDate)} 출발 · ${formatPlanDateLong(endDate)} 귀가`}</span>
            </p>
          ) : null}
        </section>

        <section className="pb-step" data-mobile-active={mobileStep === 1} aria-labelledby="plan-style-heading">
          <h2 id="plan-style-heading" className="pb-section-title">동행과 취향</h2>

          <div className="pb-group">
            <span className="pb-group__label">동행</span>
            <div className="pb-segment" role="group" aria-label="동행">
              {COMPANIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={companion === item ? "is-selected" : ""}
                  aria-pressed={companion === item}
                  onClick={() => draftStore.update({ companion: item })}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="pb-group">
            <span className="pb-group__label">취향 <em>{styles.length} / 3</em></span>
            <div className="pb-chip-row" role="group" aria-label="여행 취향">
              {STYLES.map((item) => {
                const selected = styles.includes(item);
                const disabled = !selected && styles.length >= 3;
                return (
                  <button
                    key={item}
                    type="button"
                    className={`pb-chip${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    aria-disabled={disabled}
                    onClick={() => toggleStyle(item)}
                  >
                    {selected ? <CheckIcon /> : null}
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pb-group">
            <span className="pb-group__label">하루 일정 밀도</span>
            <div className="pb-option-grid pb-option-grid--3" role="group" aria-label="하루 일정 밀도">
              {PACES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`pb-option${pace === item.id ? " is-selected" : ""}`}
                  aria-pressed={pace === item.id}
                  onClick={() => draftStore.update({ pace: item.id })}
                >
                  <SlotDots count={item.slots} />
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 04 Build mode */}
        <section className="pb-step" data-mobile-active={mobileStep === 1} aria-labelledby="plan-build-heading">
          <h2 id="plan-build-heading" className="pb-section-title">일정 작성 방식</h2>
          <div className="pb-option-grid pb-option-grid--2" role="group" aria-label="계획 생성 방식">
            {BUILD_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pb-option pb-option--build${buildMode === item.id ? " is-selected" : ""}`}
                aria-pressed={buildMode === item.id}
                onClick={() => { draftStore.update({ buildMode: item.id }); setError(null); }}
              >
                <span className="pb-option__badge">{item.badge}</span>
                <strong>{item.label}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>

          {buildMode === "auto" ? (
            <div className="pb-anchor">
              <div className="pb-group">
                <span className="pb-group__label">동선 기준</span>
                <div className="pb-segment" role="group" aria-label="동선 기준">
                  {ANCHOR_MODES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={anchorMode === item.id ? "is-selected" : ""}
                      aria-pressed={anchorMode === item.id}
                      onClick={() => { draftStore.update({ anchorMode: item.id }); setError(null); }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pb-anchor__row">
                <label className="pb-field pb-field--search">
                  <span className="sr-only">{anchorMode === "center" ? "도시·지역" : activeAnchor.label}</span>
                  <PinIcon />
                  <input
                    ref={anchorRef}
                    value={anchorInput}
                    onChange={(event) => { draftStore.update({ anchorInput: event.target.value }); setError(null); }}
                    placeholder={domestic && anchorMode === "center" ? `예: ${region || "강릉"} (비워두면 선택 지역)` : activeAnchor.placeholder}
                    inputMode="text"
                  />
                </label>
                <a className="pb-secondary" href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer">
                  Google 지도 <span aria-hidden="true"><Icon name="arrow-up-right" /></span>
                </a>
              </div>
              <p className="pb-note">
                <span>선택한 위치 주변의 장소로 일정을 제안합니다. Google 지도 공유 링크도 사용할 수 있어요.</span>
              </p>
            </div>
          ) : (
            <p className="pb-note">
              <span>{tripDays}일치 일정표를 만듭니다. 장소는 지도로 찾거나 추천 목록에서 추가할 수 있어요.</span>
            </p>
          )}
        </section>

      </div>

      {/* Preview --------------------------------------------------------- */}
      <aside className="pb-preview" data-mobile-active={mobileStep === 2} aria-label="여행 계획 요약">
        <div className="pb-ticket">
          <div className="pb-ticket__head">
            {selectedCountry ? <Flag code={selectedCountry.iso2Code} size="xl" /> : <span className="pb-ticket__placeholder-flag" aria-hidden="true" />}
            <div>
              <span className="pb-ticket__eyebrow">{selectedCountry ? `${selectedCountry.nameEn} · ${selectedCountry.iso2Code}` : "여행지 미선택"}</span>
              <h2>{domestic ? `${region.trim() || "국내"} 여행` : selectedCountry ? `${selectedCountry.nameKo} 여행` : "다음 여행을 골라보세요"}</h2>
            </div>
          </div>

          <dl className="pb-ticket__facts">
            <div>
              <dt>출발</dt>
              <dd>{startDate ? formatPlanDate(startDate) : "미정"}</dd>
            </div>
            <div>
              <dt>돌아오는 날</dt>
              <dd>{startDate ? formatPlanDate(endDate) : "미정"}</dd>
            </div>
            <div>
              <dt>기간</dt>
              <dd>{formatDuration(tripDays)}</dd>
            </div>
            <div>
              <dt>동행</dt>
              <dd>{companion}</dd>
            </div>
            {buildMode === "auto" && (
              <div className="pb-ticket__anchor">
                <dt>
                  동선 기준 · {activeAnchor.label}
                  <button type="button" className="pb-ghost" aria-label="동선 기준 수정" disabled={pending} onClick={() => {
                    flushSync(() => {
                      draftStore.update({ mobileStep: 1 });
                      setEditingFromSummary(true);
                      setError(null);
                    });
                    anchorRef.current?.focus();
                  }}>수정</button>
                </dt>
                <dd>{anchorInput.trim() || (anchorMode === "center"
                  ? (domestic ? region.trim() : selectedCountry && `${selectedCountry.nameKo} 중심`) || "여행지 선택 후 결정"
                  : "미입력")}</dd>
              </div>
            )}
          </dl>

          <div className="pb-summary-edits">
            <button type="button" className="pb-ghost" disabled={pending} onClick={() => moveMobileStep(0, true)}>여행지·날짜 수정</button>
            <button type="button" className="pb-ghost" disabled={pending} onClick={() => moveMobileStep(1, true)}>동행·취향 수정</button>
          </div>

          <div className="pb-ticket__tags">
            {(styles.length ? styles : ["자유롭게"]).map((style) => <span key={style}>{style}</span>)}
            <span className="is-muted">{activePace.label}</span>
          </div>

          {buildMode === "auto" ? (
            <section className="pb-ticket__days" aria-label="하루 일정 예시">
              <div className="pb-ticket__days-head"><strong>하루 일정 예시</strong><span>{SCHEDULES[pace].length}개 일정</span></div>
              <ol>
                {SCHEDULES[pace].map(slot => (
                  <li key={slot.startTime}>
                    <time>{slot.startTime}</time><span>{SLOT_LABEL[slot.category]}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : <p className="pb-note">{tripDays}일치 빈 일정표에 원하는 장소를 추가할 수 있어요.</p>}

          {error ? <p className="pb-error" role="alert">{error}</p> : null}

          <button type="button" className="pb-primary pb-ticket__submit" onClick={createPlan} disabled={pending}>
            {pending ? <><Spinner />{pendingLabel}</> : <>{submitLabel}<span aria-hidden="true"><Icon name="arrow-right" /></span></>}
          </button>
          <small>계획은 나에게만 보이며, 다녀온 뒤 기록으로 공개할 수 있어요.</small>
        </div>
      </aside>

      {/* Mobile action bar --------------------------------------------- */}
      {error ? <p className="pb-mobile-error" role="alert">{error}</p> : null}
      <nav className="pb-mobile-nav" aria-label="여행 계획 단계 이동">
        {mobileStep > 0 && <button type="button" className="pb-secondary" onClick={() => moveMobileStep(mobileStep - 1)} disabled={pending}>이전</button>}
        {/* The sticky progress header already names the step, so the bar holds only actions. */}
        {mobileStep < MOBILE_PLAN_STEPS.length - 1 ? (
          <button type="button" className="pb-primary" onClick={() => moveMobileStep(editingFromSummary ? summaryStep : mobileStep + 1)}>
            {editingFromSummary ? "요약으로 돌아가기" : "다음"}
          </button>
        ) : (
          <button type="button" className="pb-primary" onClick={createPlan} disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </button>
        )}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Presentational bits                                                       */
/* ------------------------------------------------------------------------ */

function Flag({ code, size = "md" }: { code: string; size?: "md" | "lg" | "xl" }) {
  const lower = code.toLowerCase();
  return (
    <span className={`pb-flag pb-flag--${size}`} aria-hidden="true">
      <b>{code}</b>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://flagcdn.com/w80/${lower}.png`}
        srcSet={`https://flagcdn.com/w160/${lower}.png 2x`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    </span>
  );
}

function SlotDots({ count }: { count: number }) {
  return (
    <span className="pb-option__dots" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <i key={index} className={index < count ? "is-on" : ""} />)}
    </span>
  );
}

function Spinner() {
  return <span className="pb-spinner" aria-hidden="true" />;
}

function SearchIcon() {
  return <Icon name="search" className="pb-icon" />;
}

function PinIcon() {
  return <Icon name="pin" className="pb-icon" />;
}

function CalendarIcon() {
  return <Icon name="calendar" className="pb-icon" />;
}

function CheckIcon() {
  return <Icon name="check" className="pb-icon pb-icon--check" />;
}
