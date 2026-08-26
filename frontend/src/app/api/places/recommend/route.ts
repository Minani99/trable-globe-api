import { NextRequest, NextResponse } from "next/server";

import {
  PLACE_RECOMMENDATION_CATEGORIES,
  type PlaceRecommendation,
  type PlaceRecommendationCategory,
} from "@/lib/place-recommendations";
import { waitForNominatimSlot } from "@/lib/nominatim";

export const dynamic = "force-dynamic";

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
}

interface NominatimRecommendationResult {
  place_id: number;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  lat: string;
  lon: string;
  category: string;
  type: string;
  name?: string;
  display_name: string;
  address?: Record<string, string>;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
}

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const RADIUS_METERS = 5_000;
const PREFERENCE_KEYS = new Set(["food", "culture", "nature", "shopping", "relax", "family"]);

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get("category") as PlaceRecommendationCategory | null;
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));
  const preferences = (request.nextUrl.searchParams.get("preferences") ?? "")
    .split(",")
    .filter((preference) => PREFERENCE_KEYS.has(preference));

  if (!category || !PLACE_RECOMMENDATION_CATEGORIES.includes(category)
    || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { success: false, data: null, message: "추천할 장소 종류와 기준 위치를 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const elements = await fetchNominatimRecommendations(category, latitude, longitude, preferences);
    const data = rankRecommendations(elements, category, latitude, longitude, preferences).slice(0, 12);
    return NextResponse.json(
      { success: true, data, message: data.length ? null : "주변에서 이름이 확인된 장소를 찾지 못했습니다." },
      { headers: { "Cache-Control": "public, max-age=1800, s-maxage=43200, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.warn("[places/recommend] Nominatim unavailable; using Overpass fallback", error);
    try {
      const elements = await fetchOverpassRecommendations(category, latitude, longitude);
      const data = rankRecommendations(elements, category, latitude, longitude, preferences).slice(0, 12);
      return NextResponse.json(
        { success: true, data, message: data.length ? null : "주변에서 이름이 확인된 장소를 찾지 못했습니다." },
        { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" } },
      );
    } catch (fallbackError) {
      console.error("[places/recommend] All recommendation providers failed", fallbackError);
      return NextResponse.json(
        { success: false, data: null, message: "주변 추천 연결이 지연되어 일반 장소 검색으로 전환합니다." },
        { status: 503 },
      );
    }
  }
}

async function fetchOverpassRecommendations(
  category: PlaceRecommendationCategory,
  latitude: number,
  longitude: number,
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(category, latitude, longitude);
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "TravelGlobe/0.1 (https://travel-globe-minani99.vercel.app/about)",
      Referer: "https://travel-globe-minani99.vercel.app/",
    },
    body: new URLSearchParams({ data: query }),
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  const body = await response.json() as { elements?: OverpassElement[] };
  return body.elements ?? [];
}

async function fetchNominatimRecommendations(
  category: PlaceRecommendationCategory,
  latitude: number,
  longitude: number,
  preferences: string[],
): Promise<OverpassElement[]> {
  const phrase = recommendationPhrase(category, preferences);
  const latitudeDelta = 0.045;
  const longitudeDelta = Math.min(0.12, 0.045 / Math.max(0.35, Math.cos((latitude * Math.PI) / 180)));
  const params = new URLSearchParams({
    q: `[${phrase}]`,
    format: "jsonv2",
    addressdetails: "1",
    extratags: "1",
    namedetails: "1",
    limit: "20",
    "accept-language": "ko,en",
    viewbox: `${longitude - longitudeDelta},${latitude - latitudeDelta},${longitude + longitudeDelta},${latitude + latitudeDelta}`,
    bounded: "1",
  });
  await waitForNominatimSlot();
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TravelGlobe/0.1 (https://travel-globe-minani99.vercel.app/about)",
      Referer: "https://travel-globe-minani99.vercel.app/",
    },
    next: { revalidate: 43_200 },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Nominatim returned ${response.status}`);
  const results = await response.json() as NominatimRecommendationResult[];
  return results.map((result) => ({
    type: result.osm_type,
    id: result.osm_id || result.place_id,
    lat: Number(result.lat),
    lon: Number(result.lon),
    tags: {
      ...(result.extratags ?? {}),
      name: result.namedetails?.["name:ko"] || result.name || result.namedetails?.name || result.display_name.split(",")[0],
      "name:en": result.namedetails?.["name:en"] ?? "",
      [result.category]: result.type,
      "addr:street": result.address?.road || result.address?.neighbourhood || result.address?.suburb || "",
    },
  })).filter((element) => Number.isFinite(element.lat) && Number.isFinite(element.lon));
}

function recommendationPhrase(category: PlaceRecommendationCategory, preferences: string[]): string {
  if (category === "food") return "restaurant";
  if (category === "cafe") return "cafe";
  if (category === "stay") return "hotel";
  if (preferences.includes("culture")) return "museum";
  if (preferences.includes("nature") || preferences.includes("family")) return "park";
  if (preferences.includes("shopping")) return "mall";
  return "attraction";
}

function buildOverpassQuery(category: PlaceRecommendationCategory, latitude: number, longitude: number): string {
  const around = `(around:${RADIUS_METERS},${latitude},${longitude})`;
  const filters: Record<PlaceRecommendationCategory, string[]> = {
    activity: [
      `["tourism"~"^(attraction|museum|gallery|viewpoint|theme_park|zoo|aquarium)$"]`,
      `["leisure"~"^(park|garden)$"]`,
      `["shop"~"^(mall|department_store)$"]`,
      `["amenity"~"^(marketplace|arts_centre|theatre)$"]`,
    ],
    food: [`["amenity"~"^(restaurant|food_court|fast_food)$"]`],
    cafe: [`["amenity"="cafe"]`],
    stay: [`["tourism"~"^(hotel|hostel|guest_house|apartment|motel|resort)$"]`],
  };
  const statements = filters[category].map((filter) => `nwr${around}${filter}["name"];`).join("\n");
  return `[out:json][timeout:10];\n(\n${statements}\n);\nout center tags;`;
}

function rankRecommendations(
  elements: OverpassElement[],
  category: PlaceRecommendationCategory,
  latitude: number,
  longitude: number,
  preferences: string[],
): PlaceRecommendation[] {
  const seen = new Set<string>();
  return elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const name = tags["name:ko"] || tags.name || tags["name:en"];
    const itemLatitude = element.lat ?? element.center?.lat;
    const itemLongitude = element.lon ?? element.center?.lon;
    if (!name || itemLatitude === undefined || itemLongitude === undefined) return [];
    const dedupeKey = `${name.toLowerCase()}:${itemLatitude.toFixed(4)}:${itemLongitude.toFixed(4)}`;
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);

    const distanceKm = distance(latitude, longitude, itemLatitude, itemLongitude);
    const preferenceMatch = matchingPreference(category, tags, preferences);
    const metadataScore = Number(Boolean(tags.opening_hours)) * 5
      + Number(Boolean(tags.website || tags["contact:website"])) * 3
      + Number(Boolean(tags.cuisine)) * 2
      + Number(Boolean(tags.stars)) * 2
      + Number(Boolean(tags.wikidata || tags.wikipedia)) * 4;
    const score = Math.max(0, 45 - distanceKm * 7) + metadataScore + (preferenceMatch ? 12 : 0);
    const categoryLabel = placeCategoryLabel(category, tags);
    const reasons = [`현재 일정에서 ${formatDistance(distanceKm)}`];
    if (preferenceMatch) reasons.push(`${preferenceMatch} 취향과 잘 맞음`);
    if (tags.opening_hours) reasons.push("영업시간 정보 있음");

    return [{
      score,
      recommendation: {
        id: `osm-${element.type}-${element.id}`,
        name,
        city: "",
        label: [categoryLabel, tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" · "),
        latitude: itemLatitude,
        longitude: itemLongitude,
        distanceKm,
        categoryLabel,
        recommendationReason: reasons.join(" · "),
        openingHours: tags.opening_hours ?? null,
        cuisine: tags.cuisine?.split(";").join(" · ") ?? null,
        stars: tags.stars ?? null,
      } satisfies PlaceRecommendation,
    }];
  }).sort((a, b) => b.score - a.score || a.recommendation.distanceKm - b.recommendation.distanceKm)
    .map(({ recommendation }) => recommendation);
}

function matchingPreference(
  category: PlaceRecommendationCategory,
  tags: Record<string, string>,
  preferences: string[],
): string | null {
  if (preferences.includes("food") && (category === "food" || category === "cafe")) return "맛집";
  if (preferences.includes("culture") && /museum|gallery|arts_centre|theatre/.test(`${tags.tourism} ${tags.amenity}`)) return "문화";
  if (preferences.includes("nature") && /viewpoint|park|garden|zoo|aquarium/.test(`${tags.tourism} ${tags.leisure}`)) return "자연";
  if (preferences.includes("shopping") && /mall|department_store|marketplace/.test(`${tags.shop} ${tags.amenity}`)) return "쇼핑";
  if (preferences.includes("relax") && /cafe|park|garden|spa/.test(`${tags.amenity} ${tags.leisure}`)) return "여유";
  if (preferences.includes("family") && /zoo|aquarium|theme_park|park/.test(`${tags.tourism} ${tags.leisure}`)) return "가족";
  return null;
}

function placeCategoryLabel(category: PlaceRecommendationCategory, tags: Record<string, string>): string {
  const value = tags.amenity || tags.tourism || tags.leisure || tags.shop || category;
  const labels: Record<string, string> = {
    restaurant: "음식점", food_court: "푸드코트", fast_food: "간편식", cafe: "카페",
    hotel: "호텔", hostel: "호스텔", guest_house: "게스트하우스", apartment: "숙소", motel: "모텔", resort: "리조트",
    attraction: "명소", museum: "박물관", gallery: "갤러리", viewpoint: "전망대", theme_park: "테마파크",
    zoo: "동물원", aquarium: "아쿠아리움", park: "공원", garden: "정원", mall: "쇼핑몰",
    department_store: "백화점", marketplace: "시장", arts_centre: "문화 공간", theatre: "공연장",
  };
  return labels[value] ?? "여행 장소";
}

function distance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(toLat - fromLat);
  const lngDelta = radians(toLng - fromLng);
  const value = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(fromLat)) * Math.cos(radians(toLat)) * Math.sin(lngDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(distanceKm: number): string {
  return distanceKm < 1 ? `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)}m` : `${distanceKm.toFixed(1)}km`;
}
