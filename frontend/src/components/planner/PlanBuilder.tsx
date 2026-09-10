"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation, readEnvelope } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import type { PlaceRecommendation, PlaceRecommendationCategory } from "@/lib/place-recommendations";
import type { TravelDetail, TravelPlaceWriteInput, TravelWriteInput } from "@/types";

/* ------------------------------------------------------------------------ */
/* Options                                                                   */
/* ------------------------------------------------------------------------ */

const COMPANIONS = ["혼자", "연인과", "친구와", "가족과"] as const;
const STYLES = ["맛집", "여유", "도시 산책", "자연", "쇼핑", "문화"] as const;
const PACES = [
  { id: "slow", label: "느긋하게", description: "하루 2~3곳", slots: 3 },
  { id: "balanced", label: "균형 있게", description: "하루 3~4곳", slots: 4 },
  { id: "full", label: "알차게", description: "하루 5곳 안팎", slots: 5 },
] as const;
const POPULAR_COUNTRIES = ["JP", "TW", "TH", "VN", "US", "FR", "IT", "ES"];
const DURATION_PRESETS = [1, 2, 3, 4, 5, 7] as const;
const MAX_TRIP_DAYS = 30;
const BUILD_MODES = [
  {
    id: "auto",
    badge: "추천",
    label: "자동으로 전부 짜기",
    description: "기준 위치 주변의 실제 장소를 시간대별로 배치한 초안을 만듭니다.",
  },
  {
    id: "skeleton",
    badge: "직접",
    label: "일차만 만들기",
    description: "날짜별 빈 칸만 만들고 장소·시간·메모를 직접 채웁니다.",
  },
] as const;
const ANCHOR_MODES = [
  { id: "center", label: "도시·지역", placeholder: "예: 도쿄 신주쿠 (비워두면 나라 중심)" },
  { id: "stay", label: "숙소", placeholder: "숙소 이름 또는 Google 지도 링크" },
  { id: "content", label: "꼭 갈 곳", placeholder: "랜드마크·공연장 또는 Google 지도 링크" },
] as const;
const MOBILE_PLAN_STEPS = ["여행지", "날짜", "취향", "만드는 방식", "확인"] as const;

type Companion = (typeof COMPANIONS)[number];
type Style = (typeof STYLES)[number];
type Pace = (typeof PACES)[number]["id"];
type BuildMode = (typeof BUILD_MODES)[number]["id"];
type AnchorMode = (typeof ANCHOR_MODES)[number]["id"];

interface LocationResult {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface ImportedGooglePlace {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface PlanAnchor extends LocationResult {
  source: AnchorMode;
}

interface ScheduleSlot {
  category: PlaceRecommendationCategory;
  startTime: string;
  durationMinutes: number;
}

const SCHEDULES: Record<Pace, ScheduleSlot[]> = {
  slow: [
    { category: "activity", startTime: "10:00", durationMinutes: 120 },
    { category: "food", startTime: "13:00", durationMinutes: 75 },
    { category: "cafe", startTime: "16:00", durationMinutes: 60 },
  ],
  balanced: [
    { category: "activity", startTime: "09:30", durationMinutes: 120 },
    { category: "food", startTime: "12:30", durationMinutes: 75 },
    { category: "activity", startTime: "15:00", durationMinutes: 120 },
    { category: "food", startTime: "19:00", durationMinutes: 90 },
  ],
  full: [
    { category: "activity", startTime: "09:00", durationMinutes: 90 },
    { category: "activity", startTime: "11:00", durationMinutes: 90 },
    { category: "food", startTime: "13:00", durationMinutes: 75 },
    { category: "cafe", startTime: "15:30", durationMinutes: 60 },
    { category: "food", startTime: "19:00", durationMinutes: 90 },
  ],
};

const SLOT_LABEL: Record<PlaceRecommendationCategory, string> = {
  activity: "볼거리",
  food: "식사",
  cafe: "카페",
  stay: "숙소",
};

/* ------------------------------------------------------------------------ */
/* Component                                                                 */
/* ------------------------------------------------------------------------ */

export function PlanBuilder({
  countries,
  today,
  initialCountryCode = "",
}: {
  countries: CountryOption[];
  today: string;
  initialCountryCode?: string;
}) {
  const router = useRouter();
  const countryMap = useMemo(
    () => new Map(countries.map((country) => [country.iso2Code, country])),
    [countries],
  );
  const popularCountries = POPULAR_COUNTRIES
    .map((code) => countryMap.get(code))
    .filter((country): country is CountryOption => Boolean(country));

  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [countryQuery, setCountryQuery] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [tripDays, setTripDays] = useState(4);
  const [companion, setCompanion] = useState<Companion>("친구와");
  const [styles, setStyles] = useState<Style[]>(["맛집", "여유"]);
  const [pace, setPace] = useState<Pace>("balanced");
  const [buildMode, setBuildMode] = useState<BuildMode>("auto");
  const [anchorMode, setAnchorMode] = useState<AnchorMode>("center");
  const [anchorInput, setAnchorInput] = useState("");
  const [mobileStep, setMobileStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("계획 만드는 중…");
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<HTMLElement>(null);
  const countrySearchId = useId();

  const selectedCountry = countryMap.get(countryCode);
  const endDate = addDays(startDate, tripDays - 1);
  const activeAnchor = ANCHOR_MODES.find((item) => item.id === anchorMode) ?? ANCHOR_MODES[0];
  const activePace = PACES.find((item) => item.id === pace) ?? PACES[1];
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [anchorInput.trim(), selectedCountry?.nameEn].filter(Boolean).join(" ") || "travel places",
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
    setCountryCode(code);
    setCountryQuery("");
    setError(null);
  }

  function toggleStyle(style: Style) {
    setStyles((current) => current.includes(style)
      ? current.filter((item) => item !== style)
      : current.length < 3 ? [...current, style] : current);
  }

  function changeTripDays(next: number) {
    setTripDays(Math.max(1, Math.min(MAX_TRIP_DAYS, next)));
  }

  function validateStep(step: number): boolean {
    if (step === 0 && !selectedCountry) {
      setError("여행할 나라를 먼저 골라 주세요.");
      return false;
    }
    if (step === 1 && !startDate) {
      setError("출발일을 선택해 주세요.");
      return false;
    }
    if (step === 3 && buildMode === "auto" && anchorMode !== "center" && anchorInput.trim().length < 2) {
      setError(anchorMode === "stay" ? "동선의 기준이 될 숙소를 입력해 주세요." : "반드시 갈 장소를 입력해 주세요.");
      return false;
    }
    return true;
  }

  function moveMobileStep(direction: -1 | 1) {
    if (direction > 0 && !validateStep(mobileStep)) return;
    const nextStep = Math.max(0, Math.min(MOBILE_PLAN_STEPS.length - 1, mobileStep + direction));
    setMobileStep(nextStep);
    setError(null);
    window.requestAnimationFrame(() => {
      progressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function createPlan() {
    for (const step of [0, 1, 3]) {
      if (!validateStep(step)) {
        setMobileStep(step);
        return;
      }
    }
    if (!selectedCountry) return;

    setPending(true);
    setError(null);
    setPendingLabel(buildMode === "auto" ? "기준 위치 찾는 중…" : "계획 만드는 중…");

    try {
      let places: TravelPlaceWriteInput[];
      let recommendationCount = 0;
      if (buildMode === "auto") {
        const anchor = await resolvePlanAnchor(selectedCountry, anchorMode, anchorInput);
        setPendingLabel("주변 장소와 동선 찾는 중…");
        const recommendations = await fetchPlanRecommendations(anchor, styles);
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
      }

      setPendingLabel("내 계획으로 저장하는 중…");
      const payload: TravelWriteInput = {
        title: `${selectedCountry.nameKo} ${tripDays}일 여행`,
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
      setError(cause instanceof ApiError ? cause.message : "여행 계획을 만들지 못했습니다.");
      setPending(false);
    }
  }

  const submitLabel = buildMode === "auto" ? "자동 일정 만들기" : "일정 만들기";
  const progress = ((mobileStep + 1) / MOBILE_PLAN_STEPS.length) * 100;

  return (
    <div className="plan-builder pb" data-step={mobileStep}>
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
      <div className="pb-form">
        {/* 01 Country */}
        <section className="pb-step" data-mobile-active={mobileStep === 0} aria-labelledby="plan-country-heading">
          <StepHeading index={1} id="plan-country-heading" title="어디로 떠날까요?" hint="나라 이름을 검색하거나 자주 찾는 여행지를 골라주세요." />

          {selectedCountry ? (
            <div className="pb-selected-country">
              <Flag code={selectedCountry.iso2Code} size="lg" />
              <div>
                <strong>{selectedCountry.nameKo}</strong>
                <span>{selectedCountry.nameEn} · {selectedCountry.iso2Code}</span>
              </div>
              <button type="button" className="pb-ghost" onClick={() => { setCountryCode(""); setCountryQuery(""); }}>변경</button>
            </div>
          ) : (
            <>
              <div className="pb-country-search">
                <label className="pb-field pb-field--search">
                  <span className="sr-only">여행할 나라 검색</span>
                  <SearchIcon />
                  <input
                    id={countrySearchId}
                    value={countryQuery}
                    onChange={(event) => { setCountryQuery(event.target.value); setError(null); }}
                    placeholder="나라 이름으로 검색 (예: 일본, Japan)"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={countryResults.length > 0}
                    aria-controls={`${countrySearchId}-results`}
                    aria-autocomplete="list"
                  />
                </label>
                {countryQuery.trim() ? (
                  <ul id={`${countrySearchId}-results`} className="pb-country-results" role="listbox" aria-label="검색 결과">
                    {countryResults.length === 0 ? (
                      <li className="pb-country-results__empty">검색 결과가 없어요. 영문 이름으로도 찾아보세요.</li>
                    ) : countryResults.map((country) => (
                      <li key={country.iso2Code} role="option" aria-selected={false}>
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

              <div className="pb-group">
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
              </div>
            </>
          )}
        </section>

        {/* 02 Dates */}
        <section className="pb-step" data-mobile-active={mobileStep === 1} aria-labelledby="plan-date-heading">
          <StepHeading index={2} id="plan-date-heading" title="언제, 며칠 동안 갈까요?" hint="출발일과 기간만 정하면 날짜별 일정표가 준비됩니다." />
          <div className="pb-date-grid">
            <label className="pb-field">
              <span className="pb-field__label">출발일</span>
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(event) => { setStartDate(event.target.value); setError(null); }}
              />
            </label>
            <div className="pb-field">
              <span className="pb-field__label">기간</span>
              <div className="pb-stepper" role="group" aria-label="여행 기간 조절">
                <button type="button" onClick={() => changeTripDays(tripDays - 1)} disabled={tripDays <= 1} aria-label="하루 줄이기">−</button>
                <output aria-live="polite">{formatDuration(tripDays)}</output>
                <button type="button" onClick={() => changeTripDays(tripDays + 1)} disabled={tripDays >= MAX_TRIP_DAYS} aria-label="하루 늘리기">+</button>
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
              <span>{formatPlanDateLong(startDate)} 출발 → {formatPlanDateLong(endDate)} 귀국</span>
            </p>
          ) : null}
        </section>

        {/* 03 Taste */}
        <section className="pb-step" data-mobile-active={mobileStep === 2} aria-labelledby="plan-style-heading">
          <StepHeading index={3} id="plan-style-heading" title="누구와, 어떤 여행인가요?" hint="추천 장소와 하루 일정의 밀도를 정하는 데 사용됩니다." />

          <div className="pb-group">
            <span className="pb-group__label">동행</span>
            <div className="pb-segment" role="group" aria-label="동행">
              {COMPANIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={companion === item ? "is-selected" : ""}
                  aria-pressed={companion === item}
                  onClick={() => setCompanion(item)}
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
                  onClick={() => setPace(item.id)}
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
        <section className="pb-step" data-mobile-active={mobileStep === 3} aria-labelledby="plan-build-heading">
          <StepHeading index={4} id="plan-build-heading" title="어디까지 맡길까요?" hint="어느 쪽을 골라도 저장 뒤에 자유롭게 수정할 수 있어요." />
          <div className="pb-option-grid pb-option-grid--2" role="group" aria-label="계획 생성 방식">
            {BUILD_MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`pb-option pb-option--build${buildMode === item.id ? " is-selected" : ""}`}
                aria-pressed={buildMode === item.id}
                onClick={() => { setBuildMode(item.id); setError(null); }}
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
                      onClick={() => { setAnchorMode(item.id); setError(null); }}
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
                    value={anchorInput}
                    onChange={(event) => { setAnchorInput(event.target.value); setError(null); }}
                    placeholder={activeAnchor.placeholder}
                    inputMode="url"
                  />
                </label>
                <a className="pb-secondary" href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer">
                  Google 지도 <span aria-hidden="true">↗</span>
                </a>
              </div>
              <p className="pb-note">
                <SparkIcon />
                <span>실제 주변 장소와 이동 거리·체류 시간 규칙으로 시간표를 만듭니다. Google 지도 공유 링크를 그대로 붙여넣어도 돼요.</span>
              </p>
            </div>
          ) : (
            <p className="pb-note">
              <SparkIcon />
              <span>{tripDays}일치 빈 일정표만 만들어 둡니다. 일정 편집 화면에서 장소 추천과 지도 검색을 바로 쓸 수 있어요.</span>
            </p>
          )}
        </section>
      </div>

      {/* Preview --------------------------------------------------------- */}
      <aside className="pb-preview" data-mobile-active={mobileStep === 4} aria-label="여행 계획 요약">
        <div className="pb-ticket">
          <div className="pb-ticket__head">
            {selectedCountry ? <Flag code={selectedCountry.iso2Code} size="xl" /> : <span className="pb-ticket__placeholder-flag" aria-hidden="true" />}
            <div>
              <span className="pb-ticket__eyebrow">{selectedCountry ? `${selectedCountry.nameEn} · ${selectedCountry.iso2Code}` : "여행지 미선택"}</span>
              <h2>{selectedCountry ? `${selectedCountry.nameKo} 여행` : "다음 여행을 골라보세요"}</h2>
            </div>
          </div>

          <dl className="pb-ticket__facts">
            <div>
              <dt>출발</dt>
              <dd>{startDate ? formatPlanDate(startDate) : "미정"}</dd>
            </div>
            <div>
              <dt>귀국</dt>
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
          </dl>

          <div className="pb-ticket__tags">
            {(styles.length ? styles : ["자유롭게"]).map((style) => <span key={style}>{style}</span>)}
            <span className="is-muted">{activePace.label}</span>
          </div>

          <div className="pb-ticket__days" aria-label="일정 미리보기">
            <div className="pb-ticket__days-head">
              <span>일정표 미리보기</span>
              <span>{buildMode === "auto" ? "장소·시간 자동 배치" : "빈 일정"}</span>
            </div>
            <ol>
              {Array.from({ length: Math.min(tripDays, 5) }, (_, index) => (
                <li key={index}>
                  <span className="pb-ticket__day-label">D{index + 1}</span>
                  <span className="pb-ticket__day-slots">
                    {buildMode === "auto"
                      ? SCHEDULES[pace].map((slot, slotIndex) => (
                        <i key={slotIndex} className={`is-${slot.category}`} title={`${slot.startTime} ${SLOT_LABEL[slot.category]}`} />
                      ))
                      : <i className="is-empty" />}
                  </span>
                </li>
              ))}
              {tripDays > 5 ? <li className="pb-ticket__more">+ {tripDays - 5}일 더</li> : null}
            </ol>
          </div>

          {error ? <p className="pb-error" role="alert">{error}</p> : null}

          <button type="button" className="pb-primary pb-ticket__submit" onClick={createPlan} disabled={pending}>
            {pending ? <><Spinner />{pendingLabel}</> : <>{submitLabel}<span aria-hidden="true">→</span></>}
          </button>
          <small>계획은 나에게만 보이며, 다녀온 뒤 기록으로 공개할 수 있어요.</small>
        </div>
      </aside>

      {/* Mobile action bar --------------------------------------------- */}
      {error ? <p className="pb-mobile-error" role="alert">{error}</p> : null}
      <nav className="pb-mobile-nav" aria-label="여행 계획 단계 이동">
        <button type="button" className="pb-secondary" onClick={() => moveMobileStep(-1)} disabled={mobileStep === 0 || pending}>이전</button>
        <span className="pb-mobile-nav__status">
          <small>{mobileStep + 1} / {MOBILE_PLAN_STEPS.length}</small>
          <strong>{MOBILE_PLAN_STEPS[mobileStep]}</strong>
        </span>
        {mobileStep < MOBILE_PLAN_STEPS.length - 1 ? (
          <button type="button" className="pb-primary" onClick={() => moveMobileStep(1)}>다음</button>
        ) : (
          <button type="button" className="pb-primary" onClick={createPlan} disabled={pending}>
            {pending ? "만드는 중…" : submitLabel}
          </button>
        )}
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Presentational bits                                                       */
/* ------------------------------------------------------------------------ */

function StepHeading({ index, id, title, hint }: { index: number; id: string; title: string; hint: string }) {
  return (
    <div className="pb-step__heading">
      <span className="pb-step__index">{String(index).padStart(2, "0")}</span>
      <div>
        <h2 id={id}>{title}</h2>
        <p>{hint}</p>
      </div>
    </div>
  );
}

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
  return <svg className="pb-icon" aria-hidden="true" viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" /><path d="m13.2 13.2 3.3 3.3" /></svg>;
}

function PinIcon() {
  return <svg className="pb-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M10 17.5s-5.5-4.6-5.5-9a5.5 5.5 0 0 1 11 0c0 4.4-5.5 9-5.5 9Z" /><circle cx="10" cy="8.5" r="2" /></svg>;
}

function CalendarIcon() {
  return <svg className="pb-icon" aria-hidden="true" viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="12" rx="2" /><path d="M6.5 3v3M13.5 3v3M3 8.5h14" /></svg>;
}

function SparkIcon() {
  return <svg className="pb-icon" aria-hidden="true" viewBox="0 0 20 20"><path d="M10 3v4M10 13v4M3 10h4M13 10h4M5.5 5.5l2.5 2.5M12 12l2.5 2.5M14.5 5.5 12 8M8 12l-2.5 2.5" /></svg>;
}

function CheckIcon() {
  return <svg className="pb-icon pb-icon--check" aria-hidden="true" viewBox="0 0 20 20"><path d="m5 10.5 3.2 3L15 6.5" /></svg>;
}

/* ------------------------------------------------------------------------ */
/* Data helpers                                                              */
/* ------------------------------------------------------------------------ */

async function resolvePlanAnchor(
  country: CountryOption,
  mode: AnchorMode,
  rawInput: string,
): Promise<PlanAnchor> {
  const input = rawInput.trim();
  if (!input && mode === "center") {
    const capital = await searchLocation(`${country.nameEn} capital`, country);
    return capital
      ? { ...capital, source: mode }
      : { name: `${country.nameKo} 중심`, city: "", latitude: country.latitude, longitude: country.longitude, source: mode };
  }

  let name = input;
  let coordinates: Pick<LocationResult, "latitude" | "longitude"> | null = null;
  if (/^https:\/\//i.test(input)) {
    const response = await fetch("/api/locations/import-google-map", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ url: input }),
      signal: AbortSignal.timeout(10_000),
    });
    const envelope = await readEnvelope<ImportedGooglePlace>(response);
    if (!response.ok || !envelope?.success || !envelope.data) {
      throw new ApiError(response.status, envelope?.message ?? "Google 지도 링크를 읽지 못했습니다.");
    }
    name = envelope.data.name?.trim() || (mode === "stay" ? "숙소" : "기준 장소");
    if (envelope.data.latitude !== null && envelope.data.longitude !== null) {
      coordinates = { latitude: envelope.data.latitude, longitude: envelope.data.longitude };
    }
  }

  if (coordinates) return { name, city: "", ...coordinates, source: mode };
  const result = await searchLocation(name, country);
  if (!result) throw new ApiError(422, `${name} 위치를 찾지 못했습니다. Google 지도 공유 링크를 붙여넣어 보세요.`);
  return { ...result, source: mode };
}

async function searchLocation(query: string, country: CountryOption): Promise<LocationResult | null> {
  const params = new URLSearchParams({
    q: query,
    country: country.iso2Code.toLowerCase(),
    lat: String(country.latitude),
    lng: String(country.longitude),
  });
  try {
    const response = await fetch(`/api/locations/search?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const envelope = await readEnvelope<LocationResult[]>(response);
    return response.ok && envelope?.success ? envelope.data?.[0] ?? null : null;
  } catch {
    return null;
  }
}

async function fetchPlanRecommendations(
  anchor: PlanAnchor,
  styles: Style[],
): Promise<Record<PlaceRecommendationCategory, PlaceRecommendation[]>> {
  const preferences = styles.map((style) => ({
    "맛집": "food",
    "여유": "relax",
    "도시 산책": "culture",
    "자연": "nature",
    "쇼핑": "shopping",
    "문화": "culture",
  })[style]).filter(Boolean).join(",");
  const categories: PlaceRecommendationCategory[] = ["activity", "food", "cafe"];
  const entries = await Promise.all(categories.map(async (category) => {
    const params = new URLSearchParams({
      category,
      detail: "all",
      lat: String(anchor.latitude),
      lng: String(anchor.longitude),
      preferences,
    });
    try {
      const response = await fetch(`/api/places/recommend?${params}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(18_000),
      });
      const envelope = await readEnvelope<PlaceRecommendation[]>(response);
      return [category, response.ok && envelope?.success ? envelope.data ?? [] : []] as const;
    } catch {
      return [category, [] as PlaceRecommendation[]] as const;
    }
  }));
  return {
    activity: entries.find(([category]) => category === "activity")?.[1] ?? [],
    food: entries.find(([category]) => category === "food")?.[1] ?? [],
    cafe: entries.find(([category]) => category === "cafe")?.[1] ?? [],
    stay: [],
  };
}

function buildAutomaticPlaces({
  selectedCountry,
  anchor,
  recommendations,
  pace,
  tripDays,
  startDate,
  styles,
}: {
  selectedCountry: CountryOption;
  anchor: PlanAnchor;
  recommendations: Record<PlaceRecommendationCategory, PlaceRecommendation[]>;
  pace: Pace;
  tripDays: number;
  startDate: string;
  styles: Style[];
}): { places: TravelPlaceWriteInput[]; recommendationCount: number } {
  const country = countryInput(selectedCountry);
  const used = new Set<string>();
  const allRecommendations = Object.values(recommendations).flat();
  let contentAnchorUsed = false;
  let recommendationCount = 0;

  function takeRecommendation(category: PlaceRecommendationCategory): PlaceRecommendation | null {
    const exact = recommendations[category].find((item) => !used.has(item.id));
    const candidate = exact ?? allRecommendations.find((item) => !used.has(item.id)) ?? null;
    if (candidate) used.add(candidate.id);
    return candidate;
  }

  const places = Array.from({ length: tripDays }, (_, dayIndex) => SCHEDULES[pace].map((slot) => {
    const visitedAt = addDays(startDate, dayIndex);
    if (anchor.source === "content" && slot.category === "activity" && !contentAnchorUsed) {
      contentAnchorUsed = true;
      recommendationCount += 1;
      return {
        country,
        city: cityInput(anchor.city, anchor.latitude, anchor.longitude),
        placeName: anchor.name,
        latitude: anchor.latitude,
        longitude: anchor.longitude,
        visitedAt,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        memo: "반드시 가고 싶은 장소를 첫 일정의 기준점으로 배치했어요.",
      } satisfies TravelPlaceWriteInput;
    }

    const recommendation = takeRecommendation(slot.category);
    if (recommendation) {
      recommendationCount += 1;
      return {
        country,
        city: cityInput(recommendation.city || anchor.city, recommendation.latitude, recommendation.longitude),
        placeName: recommendation.name,
        latitude: recommendation.latitude,
        longitude: recommendation.longitude,
        visitedAt,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        memo: [recommendation.description, recommendation.recommendationReason].filter(Boolean).join("\n"),
      } satisfies TravelPlaceWriteInput;
    }

    const categoryLabel = slot.category === "food" ? "식사" : slot.category === "cafe" ? "카페" : "할 거리";
    return {
      country,
      city: cityInput(anchor.city, anchor.latitude, anchor.longitude),
      placeName: `${dayIndex + 1}일차 · ${categoryLabel}를 골라주세요`,
      latitude: anchor.latitude,
      longitude: anchor.longitude,
      visitedAt,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
      memo: `${anchor.name} 주변에서 ${styles.join(" · ") || "원하는 취향"}에 맞는 장소를 골라보세요.`,
    } satisfies TravelPlaceWriteInput;
  })).flat();

  return { places, recommendationCount };
}

function buildSkeletonPlaces(
  selectedCountry: CountryOption,
  tripDays: number,
  startDate: string,
  styles: Style[],
  paceLabel: string,
): TravelPlaceWriteInput[] {
  const country = countryInput(selectedCountry);
  return Array.from({ length: tripDays }, (_, index) => ({
    country,
    city: null,
    placeName: `${index + 1}일차 · 장소를 골라주세요`,
    latitude: selectedCountry.latitude,
    longitude: selectedCountry.longitude,
    visitedAt: addDays(startDate, index),
    startTime: null,
    durationMinutes: null,
    memo: `${styles.join(" · ") || "하고 싶은 것"} 중심으로 ${paceLabel} 채워보세요.`,
  }));
}

function countryInput(country: CountryOption): TravelPlaceWriteInput["country"] {
  return {
    iso2Code: country.iso2Code,
    iso3Code: country.iso3Code,
    nameEn: country.nameEn,
    nameKo: country.nameKo,
    latitude: country.latitude,
    longitude: country.longitude,
  };
}

function cityInput(name: string, latitude: number, longitude: number): TravelPlaceWriteInput["city"] {
  const normalized = name.trim();
  return normalized ? { nameEn: normalized, nameKo: normalized, latitude, longitude } : null;
}

function addDays(date: string, amount: number): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

function formatDuration(days: number): string {
  return days === 1 ? "당일" : `${days - 1}박 ${days}일`;
}

function formatPlanDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatPlanDateLong(date: string): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}
