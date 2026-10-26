import { ApiError } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import { isPlaceholderPlaceName } from "@/lib/travel-placeholders";
import type { PhotoMetadata } from "@/lib/uploads/photo-metadata";
import { isRainCode, type WeatherDay } from "@/lib/weather";
import type { TravelPhotoWriteInput, TravelPlaceWriteInput, Visibility } from "@/types";

/**
 * Draft model behind TravelEditor: the editable shapes, conversion to the API payload,
 * and the scheduling rules (day ordering, time suggestions, photo matching, weather
 * replanning). Everything here is pure so it can be tested without rendering the editor.
 */

export interface PlaceDraft {
  key: string;
  countryCode: string;
  cityNameEn: string;
  cityName: string;
  placeName: string;
  latitude: string;
  longitude: string;
  visitedAt: string;
  startTime: string;
  durationMinutes: string;
  memo: string;
  completed: boolean;
}

export interface PhotoDraft {
  key: string;
  imageUrl: string;
  caption: string;
  takenAt: string;
  placeIndex: string;
  objectKey: string | null;
  previewUrl: string | null;
  file: File | null;
  progress: number;
  uploadState: "ready" | "uploading" | "error";
  uploadError: string | null;
}

export interface StoredTravelDraft {
  version: 1;
  savedAt: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  coverImageUrl: string;
  visibility: Visibility;
  places: PlaceDraft[];
  photos: Array<Omit<PhotoDraft, "previewUrl" | "file" | "progress" | "uploadState" | "uploadError">>;
}

export interface WeatherReplanProposal {
  rainyDate: string;
  sourceSignature: string;
  afterPlaces: PlaceDraft[];
  title: string;
  reason: string;
  changes: Array<{ date: string; before: string; after: string }>;
}

export interface WeatherUndoSnapshot {
  places: PlaceDraft[];
  appliedSignature: string;
}

export const draftKey = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const PLAN_SLOT_PRESETS = ["관광", "식사", "카페", "숙소"] as const;
export function emptyPlace(countryCode: string): PlaceDraft {
  return { key: draftKey(), countryCode, cityNameEn: "", cityName: "", placeName: "", latitude: "", longitude: "", visitedAt: "", startTime: "", durationMinutes: "", memo: "", completed: false };
}

export function emptyPhoto(): PhotoDraft {
  return {
    key: draftKey(), imageUrl: "", caption: "", takenAt: "", placeIndex: "",
    objectKey: null, previewUrl: null, file: null, progress: 0, uploadState: "ready", uploadError: null,
  };
}

export function toStoredPhoto(photo: PhotoDraft): StoredTravelDraft["photos"][number] {
  return {
    key: photo.key,
    imageUrl: photo.imageUrl,
    caption: photo.caption,
    takenAt: photo.takenAt,
    placeIndex: photo.placeIndex,
    objectKey: photo.objectKey,
  };
}

export function formatDraftTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(date);
}

export function datesBetween(startDate: string, endDate: string): string[] {
  if (!startDate || !endDate || endDate < startDate) return [];
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];
  const days = Math.min(Math.floor((end - start) / 86_400_000) + 1, 31);
  return Array.from({ length: days }, (_, index) => new Date(start + index * 86_400_000).toISOString().slice(0, 10));
}

export function formatPlanDay(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}

export function nextPlanningTime(existingTimes: string[], slot: (typeof PLAN_SLOT_PRESETS)[number]): string {
  const fallback: Record<(typeof PLAN_SLOT_PRESETS)[number], string> = {
    관광: "10:00", 식사: "12:30", 카페: "15:00", 숙소: "20:00",
  };
  const latest = existingTimes.filter(Boolean).sort().at(-1);
  if (!latest) return fallback[slot];
  const [hour, minute] = latest.split(":").map(Number);
  const nextMinutes = Math.min(23 * 60 + 45, hour * 60 + minute + 120);
  return `${String(Math.floor(nextMinutes / 60)).padStart(2, "0")}:${String(nextMinutes % 60).padStart(2, "0")}`;
}

export function estimatedEndTime(startTime: string, duration: string): string {
  if (!startTime || !duration) return "";
  const [hour, minute] = startTime.split(":").map(Number);
  const total = hour * 60 + minute + Number(duration);
  if (!Number.isFinite(total)) return "";
  const dayOffset = Math.floor(total / 1440);
  const withinDay = total % 1440;
  const formatted = `${String(Math.floor(withinDay / 60)).padStart(2, "0")}:${String(withinDay % 60).padStart(2, "0")}`;
  return dayOffset ? `${formatted} · 다음 날` : formatted;
}

export function isPlanningPlaceholder(place: PlaceDraft): boolean {
  return isPlaceholderPlaceName(place.placeName);
}

export function planDayInsertionIndex(places: PlaceDraft[], day: string): number {
  const lastSameDay = places.reduce(
    (lastIndex, place, index) => place.visitedAt === day ? index : lastIndex,
    -1,
  );
  if (lastSameDay >= 0) return lastSameDay + 1;
  const firstLaterDay = places.findIndex((place) => Boolean(place.visitedAt) && place.visitedAt > day);
  return firstLaterDay >= 0 ? firstLaterDay : places.length;
}

export function createWeatherReplanProposal(
  places: PlaceDraft[],
  rainyDay: WeatherDay,
  forecastDays: WeatherDay[],
): WeatherReplanProposal | null {
  const sourceSignature = placeListSignature(places);
  const rainyPlaces = places.filter((place) => place.visitedAt === rainyDay.date);
  const filledRainyPlaces = rainyPlaces.filter((place) => !isPlanningPlaceholder(place));
  const outdoorCandidate = filledRainyPlaces.find((place) => !isIndoorPlace(place));

  if (filledRainyPlaces.length > 0 && !outdoorCandidate) return null;

  const dryDates = new Set(forecastDays
    .filter((day) => day.date !== rainyDay.date
      && (day.precipitationProbability ?? 0) < 40
      && !isRainCode(day.weatherCode))
    .map((day) => day.date));
  const indoorCandidate = places.find((place) =>
    dryDates.has(place.visitedAt) && !isPlanningPlaceholder(place) && isIndoorPlace(place),
  );

  if (outdoorCandidate && indoorCandidate) {
    const alternativeDate = indoorCandidate.visitedAt;
    const afterPlaces = places.map((place) => {
      if (place.key === outdoorCandidate.key) return { ...place, visitedAt: alternativeDate };
      if (place.key === indoorCandidate.key) return { ...place, visitedAt: rainyDay.date };
      return { ...place };
    });
    return {
      rainyDate: rainyDay.date,
      sourceSignature,
      afterPlaces,
      title: "실내 일정과 야외 일정을 맞바꿨어요",
      reason: `${rainForecastLabel(rainyDay)}를 기준으로 실내 후보를 비 오는 날로 옮겼습니다. 이동시간과 예약 여부를 확인한 뒤 적용해 주세요.`,
      changes: [
        {
          date: rainyDay.date,
          before: summarizeDay(places, rainyDay.date),
          after: summarizeDay(afterPlaces, rainyDay.date),
        },
        {
          date: alternativeDate,
          before: summarizeDay(places, alternativeDate),
          after: summarizeDay(afterPlaces, alternativeDate),
        },
      ],
    };
  }

  const placeholder = rainyPlaces.find(isPlanningPlaceholder);
  let afterPlaces: PlaceDraft[];
  if (placeholder) {
    afterPlaces = places.map((place) => place.key === placeholder.key
      ? { ...place, placeName: "실내 대안 · 장소를 골라주세요", memo: "비 예보에 대비할 실내 장소를 하나 정해두세요." }
      : { ...place });
  } else {
    const anchor = rainyPlaces[0] ?? places[0];
    afterPlaces = [...places.map((place) => ({ ...place })), {
      ...emptyPlace(anchor?.countryCode ?? "KR"),
      countryCode: anchor?.countryCode ?? "KR",
      cityName: anchor?.cityName ?? "",
      cityNameEn: anchor?.cityNameEn ?? "",
      latitude: anchor?.latitude ?? "",
      longitude: anchor?.longitude ?? "",
      visitedAt: rainyDay.date,
      placeName: "실내 대안 · 장소를 골라주세요",
      memo: "비 예보에 대비할 실내 장소를 하나 정해두세요.",
    }];
  }

  return {
    rainyDate: rainyDay.date,
    sourceSignature,
    afterPlaces,
    title: "비 오는 날에 실내 대안 자리를 만들었어요",
    reason: `${rainForecastLabel(rainyDay)}가 있지만 교환할 실내 일정이 없어, 기존 일정을 지우지 않고 대체 장소 슬롯만 추가합니다.`,
    changes: [{
      date: rainyDay.date,
      before: summarizeDay(places, rainyDay.date),
      after: summarizeDay(afterPlaces, rainyDay.date),
    }],
  };
}

export function placeListSignature(places: PlaceDraft[]): string {
  return JSON.stringify(places.map((place) => [
    place.key,
    place.countryCode,
    place.cityName,
    place.placeName,
    place.visitedAt,
    place.latitude,
    place.longitude,
    place.memo,
  ]));
}

export function summarizeDay(places: PlaceDraft[], date: string): string {
  const names = places
    .filter((place) => place.visitedAt === date)
    .map((place) => place.placeName.trim())
    .filter(Boolean);
  if (names.length === 0) return "일정 없음";
  return names.length <= 2 ? names.join(" · ") : `${names.slice(0, 2).join(" · ")} 외 ${names.length - 2}곳`;
}

export function isIndoorPlace(place: PlaceDraft): boolean {
  const text = `${place.placeName} ${place.memo}`.toLowerCase();
  return [
    "박물관", "미술관", "전시", "갤러리", "카페", "커피", "식당", "레스토랑", "백화점",
    "쇼핑몰", "아쿠아리움", "수족관", "실내", "공연", "극장", "스파", "museum", "gallery",
    "cafe", "coffee", "restaurant", "mall", "aquarium", "indoor", "theater", "theatre",
  ].some((keyword) => text.includes(keyword));
}

export function rainForecastLabel(day: WeatherDay): string {
  return day.precipitationProbability == null ? "비 예보" : `${day.precipitationProbability}% 비 예보`;
}

export function inferPhotoSchedule(
  metadata: PhotoMetadata,
  places: PlaceDraft[],
  startDate: string,
  endDate: string,
): { takenAt: string; placeIndex: string } {
  const metadataDateFits = Boolean(metadata.takenAt)
    && (!startDate || metadata.takenAt! >= startDate)
    && (!endDate || metadata.takenAt! <= endDate);
  let takenAt = metadataDateFits ? metadata.takenAt! : "";
  let placeIndex = "";

  if (metadata.latitude !== null && metadata.longitude !== null) {
    const candidates = places
      .map((place, index) => ({
        index,
        place,
        latitude: coordinate(place.latitude),
        longitude: coordinate(place.longitude),
      }))
      .filter((candidate) => candidate.latitude !== null && candidate.longitude !== null);
    const sameDayCandidates = takenAt
      ? candidates.filter((candidate) => candidate.place.visitedAt === takenAt)
      : [];
    const ranked = (sameDayCandidates.length ? sameDayCandidates : candidates)
      .map((candidate) => ({
        ...candidate,
        distance: distanceInKilometers(
          metadata.latitude!,
          metadata.longitude!,
          candidate.latitude!,
          candidate.longitude!,
        ),
      }))
      .sort((left, right) => left.distance - right.distance);
    if (ranked[0] && ranked[0].distance <= 100) {
      placeIndex = String(ranked[0].index);
      if (!takenAt && ranked[0].place.visitedAt) takenAt = ranked[0].place.visitedAt;
    }
  }

  if (!placeIndex && takenAt) {
    const sameDayIndex = places.findIndex((place) => place.visitedAt === takenAt);
    if (sameDayIndex >= 0) placeIndex = String(sameDayIndex);
  }
  return { takenAt, placeIndex };
}

export function distanceInKilometers(
  firstLatitude: number,
  firstLongitude: number,
  secondLatitude: number,
  secondLongitude: number,
): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDistance = radians(secondLatitude - firstLatitude);
  const longitudeDistance = radians(secondLongitude - firstLongitude);
  const firstRadians = radians(firstLatitude);
  const secondRadians = radians(secondLatitude);
  const haversine = Math.sin(latitudeDistance / 2) ** 2
    + Math.cos(firstRadians) * Math.cos(secondRadians) * Math.sin(longitudeDistance / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function coordinate(value: string): number | null {
  const parsed = Number(value);
  return value.trim() && Number.isFinite(parsed) ? parsed : null;
}

export function findRouteAnchor(places: PlaceDraft[], currentIndex: number): { latitude: number; longitude: number } | null {
  const currentDate = places[currentIndex]?.visitedAt;
  const earlierPlaces = places.slice(0, currentIndex).reverse();
  const candidates = [
    ...earlierPlaces.filter((place) => place.visitedAt === currentDate),
    ...earlierPlaces.filter((place) => place.visitedAt !== currentDate),
  ];
  for (const place of candidates) {
    if (isPlanningPlaceholder(place)) continue;
    const latitude = coordinate(place.latitude);
    const longitude = coordinate(place.longitude);
    if (latitude !== null && longitude !== null) return { latitude, longitude };
  }
  return null;
}

export function recommendationPreferences(source: string): string[] {
  const text = source.toLowerCase();
  const keywords: Array<[string, string[]]> = [
    ["food", ["맛집", "미식", "음식", "먹방", "카페", "food", "gourmet"]],
    ["culture", ["문화", "박물관", "미술관", "전시", "역사", "공연", "culture", "museum"]],
    ["nature", ["자연", "공원", "산", "바다", "정원", "풍경", "nature", "hiking"]],
    ["shopping", ["쇼핑", "시장", "백화점", "기념품", "shopping", "market"]],
    ["relax", ["여유", "휴식", "힐링", "느긋", "relax", "slow"]],
    ["family", ["가족", "아이", "부모님", "family", "kids"]],
  ];
  return keywords.filter(([, values]) => values.some((keyword) => text.includes(keyword))).map(([key]) => key);
}

export function toPlaceInput(place: PlaceDraft, countries: Map<string, CountryOption>): TravelPlaceWriteInput {
  const country = countries.get(place.countryCode);
  if (!country) throw new ApiError(400, "나라를 선택해 주세요.");
  if (!place.latitude.trim() || !place.longitude.trim()) {
    throw new ApiError(400, "장소를 검색하거나 지도에서 방문 위치를 선택해 주세요.");
  }
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new ApiError(400, "장소 좌표를 확인해 주세요.");
  const cityNameKo = nullable(place.cityName);
  const cityNameEn = nullable(place.cityNameEn) ?? cityNameKo;
  return {
    country: {
      iso2Code: country.iso2Code, iso3Code: country.iso3Code,
      nameEn: country.nameEn, nameKo: country.nameKo,
      latitude: country.latitude, longitude: country.longitude,
    },
    city: cityNameKo ? { nameEn: cityNameEn!, nameKo: cityNameKo, latitude, longitude } : null,
    placeName: place.placeName.trim(), latitude, longitude,
    visitedAt: nullable(place.visitedAt), memo: nullable(place.memo),
    startTime: nullable(place.startTime),
    durationMinutes: place.durationMinutes ? Number(place.durationMinutes) : null,
    completed: place.completed,
  };
}

export function toPhotoInput(photo: PhotoDraft): TravelPhotoWriteInput {
  return {
    imageUrl: photo.imageUrl.trim(), caption: nullable(photo.caption), takenAt: nullable(photo.takenAt),
    placeIndex: photo.placeIndex === "" ? null : Number(photo.placeIndex),
  };
}
