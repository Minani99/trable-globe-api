import { ApiError, readEnvelope } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import type { PlaceRecommendation, PlaceRecommendationCategory } from "@/lib/place-recommendations";
import type { TravelPlaceWriteInput } from "@/types";

/**
 * Plan builder rules outside the component: the choices it offers, how a pace becomes a
 * daily schedule, how recommendations fill that schedule, and the location lookups it
 * calls. Kept free of React so the scheduling can be tested directly.
 */

/* ------------------------------------------------------------------------ */
/* Options                                                                   */
/* ------------------------------------------------------------------------ */

export const COMPANIONS = ["혼자", "연인과", "친구와", "가족과"] as const;
export const STYLES = ["맛집", "여유", "도시 산책", "자연", "쇼핑", "문화"] as const;
export const PACES = [
  { id: "slow", label: "느긋하게", description: "하루 2~3곳", slots: 3 },
  { id: "balanced", label: "균형 있게", description: "하루 3~4곳", slots: 4 },
  { id: "full", label: "알차게", description: "하루 5곳 안팎", slots: 5 },
] as const;
export const POPULAR_COUNTRIES = ["JP", "TW", "TH", "VN", "US", "FR", "IT", "ES"];
export const DURATION_PRESETS = [1, 2, 3, 4, 5, 7] as const;
export const MAX_TRIP_DAYS = 30;
export const BUILD_MODES = [
  {
    id: "auto",
    badge: "장소 추천",
    label: "추천 일정으로 시작",
    description: "기준 위치 주변의 실제 장소를 시간대별로 배치한 초안을 만듭니다.",
  },
  {
    id: "skeleton",
    badge: "빈 일정",
    label: "직접 일정 채우기",
    description: "날짜별 빈 칸만 만들고 장소·시간·메모를 직접 채웁니다.",
  },
] as const;
export const ANCHOR_MODES = [
  { id: "center", label: "도시·지역", placeholder: "예: 도쿄 신주쿠 (비워두면 나라 중심)" },
  { id: "stay", label: "숙소", placeholder: "숙소 이름 또는 Google 지도 링크" },
  { id: "content", label: "꼭 갈 곳", placeholder: "랜드마크·공연장 또는 Google 지도 링크" },
] as const;
export const MOBILE_PLAN_STEPS = ["여행지와 날짜", "일정 방식", "확인"] as const;

export type Companion = (typeof COMPANIONS)[number];
export type Style = (typeof STYLES)[number];
export type Pace = (typeof PACES)[number]["id"];
export type BuildMode = (typeof BUILD_MODES)[number]["id"];
export type AnchorMode = (typeof ANCHOR_MODES)[number]["id"];

export interface LocationResult {
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface ImportedGooglePlace {
  name: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface PlanAnchor extends LocationResult {
  source: AnchorMode;
}

export interface ScheduleSlot {
  category: PlaceRecommendationCategory;
  startTime: string;
  durationMinutes: number;
}

export const SCHEDULES: Record<Pace, ScheduleSlot[]> = {
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

export const SLOT_LABEL: Record<PlaceRecommendationCategory, string> = {
  activity: "볼거리",
  food: "식사",
  cafe: "카페",
  stay: "숙소",
};

/* ------------------------------------------------------------------------ */
/* Component                                                                 */
/* ------------------------------------------------------------------------ */

/* ------------------------------------------------------------------------ */
/* Data helpers                                                              */
/* ------------------------------------------------------------------------ */

export async function resolvePlanAnchor(
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

export async function searchLocation(query: string, country: CountryOption): Promise<LocationResult | null> {
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

export async function fetchPlanRecommendations(
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

export function buildAutomaticPlaces({
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

export function buildSkeletonPlaces(
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

export function countryInput(country: CountryOption): TravelPlaceWriteInput["country"] {
  return {
    iso2Code: country.iso2Code,
    iso3Code: country.iso3Code,
    nameEn: country.nameEn,
    nameKo: country.nameKo,
    latitude: country.latitude,
    longitude: country.longitude,
  };
}

export function cityInput(name: string, latitude: number, longitude: number): TravelPlaceWriteInput["city"] {
  const normalized = name.trim();
  return normalized ? { nameEn: normalized, nameKo: normalized, latitude, longitude } : null;
}

export function addDays(date: string, amount: number): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

export function formatDuration(days: number): string {
  return days === 1 ? "당일" : `${days - 1}박 ${days}일`;
}

export function formatPlanDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function formatPlanDateLong(date: string): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${month}월 ${day}일 (${weekday})`;
}
