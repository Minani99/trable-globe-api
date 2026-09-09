"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation, readEnvelope } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import type { PlaceRecommendation, PlaceRecommendationCategory } from "@/lib/place-recommendations";
import type { TravelDetail, TravelPlaceWriteInput, TravelWriteInput } from "@/types";

const COMPANIONS = ["혼자", "연인과", "친구와", "가족과"] as const;
const STYLES = ["맛집", "여유", "도시 산책", "자연", "쇼핑", "문화"] as const;
const PACES = [
  { id: "slow", label: "느긋하게", description: "하루 2~3곳" },
  { id: "balanced", label: "균형 있게", description: "하루 3~4곳" },
  { id: "full", label: "알차게", description: "하루 5곳 안팎" },
] as const;
const POPULAR_COUNTRIES = ["JP", "TW", "TH", "VN", "US", "FR", "IT", "ES"];
const BUILD_MODES = [
  { id: "auto", label: "자동으로 전부 짜기", description: "주변 장소와 시간표까지 한 번에" },
  { id: "skeleton", label: "일차만 만들기", description: "빈 일차를 만들고 직접 채우기" },
] as const;
const ANCHOR_MODES = [
  { id: "center", label: "도시·지역", placeholder: "예: 도쿄 신주쿠 (비워두면 나라 중심)" },
  { id: "stay", label: "숙소", placeholder: "숙소 이름 또는 Google 지도 링크" },
  { id: "content", label: "꼭 갈 곳", placeholder: "랜드마크·공연장 또는 Google 지도 링크" },
] as const;
const MOBILE_PLAN_STEPS = ["여행지", "날짜", "취향", "만드는 방식", "확인"] as const;

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

const SCHEDULES: Record<(typeof PACES)[number]["id"], ScheduleSlot[]> = {
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

export function PlanBuilder({ countries, today, initialCountryCode = "" }: { countries: CountryOption[]; today: string; initialCountryCode?: string }) {
  const router = useRouter();
  const countryMap = useMemo(
    () => new Map(countries.map((country) => [country.iso2Code, country])),
    [countries],
  );
  const popularCountries = POPULAR_COUNTRIES
    .map((code) => countryMap.get(code))
    .filter((country): country is CountryOption => Boolean(country));
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [startDate, setStartDate] = useState(today);
  const [tripDays, setTripDays] = useState(4);
  const [companion, setCompanion] = useState<(typeof COMPANIONS)[number]>("친구와");
  const [styles, setStyles] = useState<Array<(typeof STYLES)[number]>>(["맛집", "여유"]);
  const [pace, setPace] = useState<(typeof PACES)[number]["id"]>("balanced");
  const [buildMode, setBuildMode] = useState<BuildMode>("auto");
  const [anchorMode, setAnchorMode] = useState<AnchorMode>("center");
  const [anchorInput, setAnchorInput] = useState("");
  const [mobileStep, setMobileStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [pendingLabel, setPendingLabel] = useState("계획 만드는 중…");
  const [error, setError] = useState<string | null>(null);
  const selectedCountry = countryMap.get(countryCode);
  const endDate = addDays(startDate, tripDays - 1);
  const activeAnchor = ANCHOR_MODES.find((item) => item.id === anchorMode) ?? ANCHOR_MODES[0];
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [anchorInput.trim(), selectedCountry?.nameEn].filter(Boolean).join(" ") || "travel places",
  )}`;

  function toggleStyle(style: (typeof STYLES)[number]) {
    setStyles((current) => current.includes(style)
      ? current.filter((item) => item !== style)
      : current.length < 3 ? [...current, style] : current);
  }

  function validateMobileStep(step: number): boolean {
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
    if (direction > 0 && !validateMobileStep(mobileStep)) return;
    const nextStep = Math.max(0, Math.min(MOBILE_PLAN_STEPS.length - 1, mobileStep + direction));
    setMobileStep(nextStep);
    setError(null);
    window.requestAnimationFrame(() => {
      document.getElementById("mobile-plan-progress")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function createPlan() {
    if (!selectedCountry) {
      setError("먼저 여행할 나라를 골라 주세요.");
      return;
    }
    if (!startDate) {
      setError("출발일을 선택해 주세요.");
      return;
    }
    if (buildMode === "auto" && anchorMode !== "center" && anchorInput.trim().length < 2) {
      setError(anchorMode === "stay" ? "동선의 기준이 될 숙소를 입력해 주세요." : "반드시 갈 장소를 입력해 주세요.");
      return;
    }

    setPending(true);
    setError(null);
    setPendingLabel(buildMode === "auto" ? "기준 위치 찾는 중…" : "계획 만드는 중…");
    const paceLabel = PACES.find((item) => item.id === pace)?.label ?? "균형 있게";

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
        places = buildSkeletonPlaces(selectedCountry, tripDays, startDate, styles, paceLabel);
      }

      setPendingLabel("내 계획으로 저장하는 중…");
      const payload: TravelWriteInput = {
        title: `${selectedCountry.nameKo} ${tripDays}일 여행`,
        description: `${companion} 떠나는 ${styles.join(" · ") || "자유로운"} 여행 · ${paceLabel}`,
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

  return (
    <div className="plan-builder">
      <header id="mobile-plan-progress" className="plan-builder__mobile-progress">
        <div><span>STEP {mobileStep + 1} / {MOBILE_PLAN_STEPS.length}</span><strong>{MOBILE_PLAN_STEPS[mobileStep]}</strong></div>
        <span role="progressbar" aria-label="여행 계획 작성 진행률" aria-valuemin={1} aria-valuemax={MOBILE_PLAN_STEPS.length} aria-valuenow={mobileStep + 1}>
          <i style={{ width: `${((mobileStep + 1) / MOBILE_PLAN_STEPS.length) * 100}%` }} />
        </span>
      </header>
      <div className="plan-builder__main">
        <section className="plan-step" data-mobile-active={mobileStep === 0} aria-labelledby="plan-country-heading">
          <div className="plan-step__heading"><span>01</span><div><p className="eyebrow">Destination</p><h2 id="plan-country-heading">어디로 떠날까요?</h2></div></div>
          <label className="plan-country-select">
            <span className="sr-only">여행할 나라</span>
            <select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setError(null); }}>
              <option value="">나라를 검색하거나 선택하세요</option>
              {countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}
            </select>
          </label>
          <div className="plan-choice-row" aria-label="인기 여행지">
            {popularCountries.map((country) => (
              <button key={country.iso2Code} type="button" className={countryCode === country.iso2Code ? "is-selected" : ""} onClick={() => { setCountryCode(country.iso2Code); setError(null); }}>
                {country.nameKo}
              </button>
            ))}
          </div>
        </section>

        <section className="plan-step" data-mobile-active={mobileStep === 1} aria-labelledby="plan-date-heading">
          <div className="plan-step__heading"><span>02</span><div><p className="eyebrow">When</p><h2 id="plan-date-heading">언제, 며칠 동안 갈까요?</h2></div></div>
          <div className="plan-date-row">
            <label><span>출발일</span><input type="date" min={today} value={startDate} onChange={(event) => { setStartDate(event.target.value); setError(null); }} /></label>
            <div><span>여행 기간</span><div className="plan-choice-row is-compact">{[1, 2, 3, 4, 5, 7].map((days) => <button key={days} type="button" className={tripDays === days ? "is-selected" : ""} onClick={() => setTripDays(days)}>{days === 1 ? "당일" : `${days - 1}박 ${days}일`}</button>)}</div></div>
          </div>
        </section>

        <section className="plan-step" data-mobile-active={mobileStep === 2} aria-labelledby="plan-style-heading">
          <div className="plan-step__heading"><span>03</span><div><p className="eyebrow">Mood</p><h2 id="plan-style-heading">누구와, 어떤 여행인가요?</h2></div></div>
          <div className="plan-option-group"><span>동행</span><div className="plan-choice-row">{COMPANIONS.map((item) => <button key={item} type="button" className={companion === item ? "is-selected" : ""} onClick={() => setCompanion(item)}>{item}</button>)}</div></div>
          <div className="plan-option-group"><span>취향 · 최대 3개</span><div className="plan-choice-row">{STYLES.map((item) => <button key={item} type="button" className={styles.includes(item) ? "is-selected" : ""} onClick={() => toggleStyle(item)} aria-pressed={styles.includes(item)}>{item}</button>)}</div></div>
          <div className="plan-pace-grid">{PACES.map((item) => <button key={item.id} type="button" className={pace === item.id ? "is-selected" : ""} onClick={() => setPace(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
        </section>

        <section className="plan-step" data-mobile-active={mobileStep === 3} aria-labelledby="plan-build-heading">
          <div className="plan-step__heading"><span>04</span><div><p className="eyebrow">Start point</p><h2 id="plan-build-heading">어디까지 맡길까요?</h2></div></div>
          <div className="plan-build-mode" role="group" aria-label="계획 생성 방식">
            {BUILD_MODES.map((item) => (
              <button key={item.id} type="button" className={buildMode === item.id ? "is-selected" : ""} onClick={() => { setBuildMode(item.id); setError(null); }} aria-pressed={buildMode === item.id}>
                <span>{item.id === "auto" ? "추천" : "직접"}</span><strong>{item.label}</strong><small>{item.description}</small>
              </button>
            ))}
          </div>
          {buildMode === "auto" ? (
            <div className="plan-anchor">
              <div className="plan-option-group">
                <span>동선 기준 하나만 골라주세요</span>
                <div className="plan-choice-row">
                  {ANCHOR_MODES.map((item) => <button key={item.id} type="button" className={anchorMode === item.id ? "is-selected" : ""} onClick={() => { setAnchorMode(item.id); setError(null); }}>{item.label}</button>)}
                </div>
              </div>
              <div className="plan-anchor__input-row">
                <label>
                  <span>{anchorMode === "center" ? "도시·지역 (선택)" : activeAnchor.label}</span>
                  <input value={anchorInput} onChange={(event) => { setAnchorInput(event.target.value); setError(null); }} placeholder={activeAnchor.placeholder} inputMode="url" />
                </label>
                <a href={googleMapsSearchUrl} target="_blank" rel="noopener noreferrer">Google 지도에서 찾기 <span aria-hidden="true">↗</span></a>
              </div>
              <p className="plan-anchor__hint"><span aria-hidden="true">✦</span><span><strong>자동 초안 베타</strong> 실제 주변 장소와 이동 거리·체류 규칙으로 시간표를 만듭니다. Google 지도 공유 링크도 그대로 붙여넣을 수 있고, 결과는 저장 전에 언제든 바꿀 수 있어요.</span></p>
            </div>
          ) : (
            <p className="plan-anchor__hint is-muted"><span aria-hidden="true">＋</span><span><strong>가볍게 시작</strong> 날짜별 빈 칸만 만들고 장소, 시간, 메모를 직접 채웁니다.</span></p>
          )}
        </section>
      </div>

      <aside className="plan-summary" data-mobile-active={mobileStep === 4} aria-label="여행 계획 요약">
        <p className="eyebrow">Your next world</p>
        <span className="plan-summary__number">{selectedCountry ? selectedCountry.iso2Code : "––"}</span>
        <h2>{selectedCountry ? `${selectedCountry.nameKo} 여행` : "다음 여행을 골라보세요"}</h2>
        <dl>
          <div><dt>일정</dt><dd>{startDate ? `${formatPlanDate(startDate)} → ${formatPlanDate(endDate)}` : "미정"}</dd></div>
          <div><dt>기간</dt><dd>{tripDays - 1}박 {tripDays}일</dd></div>
          <div><dt>분위기</dt><dd>{styles.length ? styles.join(" · ") : "자유롭게"}</dd></div>
          <div><dt>일정표</dt><dd>{buildMode === "auto" ? "장소 · 시간 자동 초안" : `${tripDays}일 빈 일정`}</dd></div>
        </dl>
        <div className="plan-summary__promise"><span aria-hidden="true">✓</span><p><strong>{buildMode === "auto" ? "기준 하나면 충분해요" : "내 방식대로 시작"}</strong>{buildMode === "auto" ? `${activeAnchor.label} 주변의 실제 장소를 시간대별로 배치해 드려요.` : "날짜별 뼈대만 만들고 원하는 장소를 직접 채울 수 있어요."}</p></div>
        {error ? <p className="plan-builder__error" role="alert">{error}</p> : null}
        <button type="button" className="plan-summary__submit" onClick={createPlan} disabled={pending}>
          {pending ? pendingLabel : buildMode === "auto" ? "딸깍, 자동 일정 만들기" : "빈 일정 만들기"}<span aria-hidden="true">→</span>
        </button>
        <small>계획은 나에게만 보이며, 다녀온 뒤 기록으로 공개할 수 있어요.</small>
      </aside>

      {error ? <p className="plan-builder__mobile-error" role="alert">{error}</p> : null}
      <nav className="plan-builder__mobile-nav" aria-label="여행 계획 단계 이동">
        <button type="button" className="is-previous" onClick={() => moveMobileStep(-1)} disabled={mobileStep === 0 || pending}>이전</button>
        <span><small>{mobileStep + 1} / {MOBILE_PLAN_STEPS.length}</small><strong>{MOBILE_PLAN_STEPS[mobileStep]}</strong></span>
        {mobileStep < MOBILE_PLAN_STEPS.length - 1 ? (
          <button type="button" className="is-next" onClick={() => moveMobileStep(1)}>다음</button>
        ) : (
          <button type="button" className="is-next" onClick={createPlan} disabled={pending}>{pending ? "만드는 중…" : buildMode === "auto" ? "자동 일정 만들기" : "일정 만들기"}</button>
        )}
      </nav>
    </div>
  );
}

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
  styles: Array<(typeof STYLES)[number]>,
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
  pace: (typeof PACES)[number]["id"];
  tripDays: number;
  startDate: string;
  styles: Array<(typeof STYLES)[number]>;
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
  styles: Array<(typeof STYLES)[number]>,
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

function formatPlanDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}
