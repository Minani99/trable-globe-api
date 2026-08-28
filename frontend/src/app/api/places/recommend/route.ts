import { NextRequest, NextResponse } from "next/server";

import {
  PLACE_RECOMMENDATION_CATEGORIES,
  PLACE_RECOMMENDATION_DETAILS,
  type PlaceRecommendation,
  type PlaceRecommendationCategory,
  type PlaceRecommendationDetail,
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
  const requestedDetail = request.nextUrl.searchParams.get("detail");
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

  const detail = recommendationDetail(category, requestedDetail);

  try {
    const elements = await fetchNominatimRecommendations(category, detail, latitude, longitude, preferences);
    const data = rankRecommendations(elements, category, detail, latitude, longitude, preferences).slice(0, 12);
    return NextResponse.json(
      { success: true, data, message: data.length ? null : "주변에서 이름이 확인된 장소를 찾지 못했습니다." },
      { headers: { "Cache-Control": "public, max-age=1800, s-maxage=43200, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.warn("[places/recommend] Nominatim unavailable; using Overpass fallback", error);
    try {
      const elements = await fetchOverpassRecommendations(category, detail, latitude, longitude);
      const data = rankRecommendations(elements, category, detail, latitude, longitude, preferences).slice(0, 12);
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
  detail: PlaceRecommendationDetail,
  latitude: number,
  longitude: number,
): Promise<OverpassElement[]> {
  const query = buildOverpassQuery(category, detail, latitude, longitude);
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
  detail: PlaceRecommendationDetail,
  latitude: number,
  longitude: number,
  preferences: string[],
): Promise<OverpassElement[]> {
  const phrase = recommendationPhrase(category, detail, preferences);
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
      name: result.name || result.namedetails?.name || result.display_name.split(",")[0],
      "name:local": result.name || result.namedetails?.name || result.display_name.split(",")[0],
      "name:ko": result.namedetails?.["name:ko"] ?? "",
      "name:en": result.namedetails?.["name:en"] ?? "",
      [result.category]: result.type,
      "addr:street": result.address?.road || result.address?.neighbourhood || result.address?.suburb || "",
      "addr:city": result.address?.city || result.address?.town || result.address?.village || "",
    },
  })).filter((element) => Number.isFinite(element.lat) && Number.isFinite(element.lon));
}

function recommendationPhrase(
  category: PlaceRecommendationCategory,
  detail: PlaceRecommendationDetail,
  preferences: string[],
): string {
  const detailPhrases: Partial<Record<PlaceRecommendationDetail, string>> = {
    landmark: "attraction", culture: "museum", nature: "park", shopping: "marketplace", family: "zoo",
    quick: "fast food", bakery: "bakery", dessert: "ice cream", brunch: "cafe",
    hotel: "hotel", hostel: "hostel", guest_house: "guest house", resort: "resort", apartment: "apartment",
  };
  if (detail !== "all" && detailPhrases[detail]) return detailPhrases[detail]!;
  if (category === "food") return "restaurant";
  if (category === "cafe") return "cafe";
  if (category === "stay") return "hotel";
  if (preferences.includes("culture")) return "museum";
  if (preferences.includes("nature") || preferences.includes("family")) return "park";
  if (preferences.includes("shopping")) return "mall";
  return "attraction";
}

function buildOverpassQuery(
  category: PlaceRecommendationCategory,
  detail: PlaceRecommendationDetail,
  latitude: number,
  longitude: number,
): string {
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
  const detailFilters: Partial<Record<PlaceRecommendationDetail, string[]>> = {
    landmark: [`["tourism"~"^(attraction|viewpoint)$"]`],
    culture: [`["tourism"~"^(museum|gallery)$"]`, `["amenity"~"^(arts_centre|theatre)$"]`],
    nature: [`["leisure"~"^(park|garden)$"]`, `["tourism"="viewpoint"]`],
    shopping: [`["shop"~"^(mall|department_store)$"]`, `["amenity"="marketplace"]`],
    family: [`["tourism"~"^(theme_park|zoo|aquarium)$"]`, `["leisure"="park"]`],
    quick: [`["amenity"~"^(fast_food|food_court)$"]`],
    bakery: [`["shop"="bakery"]`, `["amenity"="cafe"]["cuisine"~"bakery|cake|dessert",i]`],
    dessert: [`["amenity"~"^(cafe|ice_cream)$"]["cuisine"~"dessert|ice_cream|cake",i]`],
    brunch: [`["amenity"="cafe"]["cuisine"~"brunch|breakfast",i]`],
    hotel: [`["tourism"="hotel"]`], hostel: [`["tourism"="hostel"]`],
    guest_house: [`["tourism"="guest_house"]`], resort: [`["tourism"="resort"]`],
    apartment: [`["tourism"="apartment"]`],
  };
  const selectedFilters = detail === "all" ? filters[category] : (detailFilters[detail] ?? filters[category]);
  const statements = selectedFilters.map((filter) => `nwr${around}${filter}["name"];`).join("\n");
  return `[out:json][timeout:10];\n(\n${statements}\n);\nout center tags;`;
}

function rankRecommendations(
  elements: OverpassElement[],
  category: PlaceRecommendationCategory,
  detail: PlaceRecommendationDetail,
  latitude: number,
  longitude: number,
  preferences: string[],
): PlaceRecommendation[] {
  const seen = new Set<string>();
  return elements.flatMap((element) => {
    const tags = element.tags ?? {};
    const koreanName = tags["name:ko"]?.trim();
    const englishName = tags["name:en"]?.trim();
    const localName = (tags["name:local"] || tags.name)?.trim();
    const name = koreanName || englishName || localName;
    const itemLatitude = element.lat ?? element.center?.lat;
    const itemLongitude = element.lon ?? element.center?.lon;
    if (!name || itemLatitude === undefined || itemLongitude === undefined) return [];
    const dedupeKey = `${name.toLowerCase()}:${itemLatitude.toFixed(4)}:${itemLongitude.toFixed(4)}`;
    if (seen.has(dedupeKey)) return [];
    seen.add(dedupeKey);

    const distanceKm = distance(latitude, longitude, itemLatitude, itemLongitude);
    const preferenceMatch = matchingPreference(category, tags, preferences);
    const detailMatch = matchingDetail(detail, tags);
    const metadataScore = Number(Boolean(tags.opening_hours)) * 5
      + Number(Boolean(tags.website || tags["contact:website"])) * 3
      + Number(Boolean(tags.cuisine)) * 2
      + Number(Boolean(tags.stars)) * 2
      + Number(Boolean(tags.wikidata || tags.wikipedia)) * 4;
    const score = Math.max(0, 45 - distanceKm * 7) + metadataScore
      + (preferenceMatch ? 12 : 0) + (detailMatch ? 16 : 0);
    const categoryLabel = placeCategoryLabel(category, tags);
    const reasons = [`현재 일정에서 ${formatDistance(distanceKm)}`];
    if (detailMatch) reasons.push(`${detailMatch} 조건과 가까움`);
    if (preferenceMatch) reasons.push(`${preferenceMatch} 취향과 잘 맞음`);
    if (tags.opening_hours) reasons.push("영업시간 정보 있음");

    return [{
      score,
      recommendation: {
        id: `osm-${element.type}-${element.id}`,
        name,
        nameLocale: koreanName ? "ko" : englishName ? "en" : "local",
        localName: localName && localName !== name ? localName : null,
        city: tags["addr:city"] ?? "",
        label: [categoryLabel, tags["addr:street"], tags["addr:housenumber"]].filter(Boolean).join(" · "),
        description: describePlace(category, tags, categoryLabel),
        latitude: itemLatitude,
        longitude: itemLongitude,
        distanceKm,
        categoryLabel,
        recommendationReason: reasons.join(" · "),
        openingHours: tags.opening_hours ?? null,
        cuisine: tags.cuisine?.split(";").join(" · ") ?? null,
        stars: tags.stars ?? null,
        features: placeFeatures(tags),
      } satisfies PlaceRecommendation,
    }];
  }).sort((a, b) => b.score - a.score || a.recommendation.distanceKm - b.recommendation.distanceKm)
    .map(({ recommendation }) => recommendation);
}

function recommendationDetail(
  category: PlaceRecommendationCategory,
  requested: string | null,
): PlaceRecommendationDetail {
  const options = PLACE_RECOMMENDATION_DETAILS[category] as readonly { id: PlaceRecommendationDetail }[];
  return requested && options.some((option) => option.id === requested)
    ? requested as PlaceRecommendationDetail
    : "all";
}

function matchingDetail(detail: PlaceRecommendationDetail, tags: Record<string, string>): string | null {
  if (detail === "all") return null;
  const source = `${tags.amenity} ${tags.tourism} ${tags.leisure} ${tags.shop} ${tags.cuisine} ${tags["diet:vegetarian"]}`.toLowerCase();
  const labels: Partial<Record<PlaceRecommendationDetail, [RegExp, string]>> = {
    landmark: [/attraction|viewpoint/, "랜드마크"], culture: [/museum|gallery|arts_centre|theatre/, "박물관·전시"],
    nature: [/park|garden|viewpoint/, "공원·자연"], shopping: [/mall|department_store|marketplace/, "시장·쇼핑"],
    family: [/theme_park|zoo|aquarium|park/, "가족·체험"], local: [/restaurant|food_court|cuisine/, "현지 음식"],
    korean: [/korean/, "한식"], japanese: [/japanese|sushi|ramen|udon/, "일식"],
    vegetarian: [/vegetarian|vegan|yes/, "채식"], quick: [/fast_food|food_court/, "간단한 식사"],
    coffee: [/cafe|coffee/, "커피"], bakery: [/bakery|cake/, "베이커리"],
    dessert: [/dessert|ice_cream|cake/, "디저트"], brunch: [/brunch|breakfast/, "브런치"],
    hotel: [/hotel/, "호텔"], hostel: [/hostel/, "호스텔"], guest_house: [/guest_house/, "게스트하우스"],
    resort: [/resort/, "리조트"], apartment: [/apartment/, "아파트형"],
  };
  const match = labels[detail];
  return match?.[0].test(source) ? match[1] : null;
}

function describePlace(
  category: PlaceRecommendationCategory,
  tags: Record<string, string>,
  categoryLabel: string,
): string {
  const cuisine = koreanCuisine(tags.cuisine);
  if (category === "food") {
    return cuisine
      ? `${cuisine} 메뉴를 주로 제공하는 ${categoryLabel}입니다.`
      : `현지 식사 후보로 볼 수 있는 ${categoryLabel}입니다. 메뉴는 Google 지도에서 한 번 더 확인해 보세요.`;
  }
  if (category === "cafe") {
    if (/bakery|cake|dessert/.test(tags.cuisine ?? tags.shop ?? "")) return `빵이나 디저트와 함께 쉬기 좋은 ${categoryLabel}입니다.`;
    return `커피와 휴식을 위한 ${categoryLabel}입니다. 대표 메뉴와 분위기는 Google 지도에서 확인할 수 있어요.`;
  }
  if (category === "stay") {
    return tags.stars ? `${tags.stars}성급으로 등록된 ${categoryLabel}입니다.` : `여행 동선 가까이에서 살펴볼 수 있는 ${categoryLabel}입니다.`;
  }
  const descriptions: Record<string, string> = {
    "명소": "대표적인 볼거리로 등록된 여행 명소입니다.", "박물관": "전시와 소장품을 관람하는 문화 공간입니다.",
    "갤러리": "미술 작품이나 기획 전시를 관람하는 공간입니다.", "전망대": "도시나 자연 풍경을 조망하기 좋은 장소입니다.",
    "테마파크": "놀이와 체험을 함께 즐기는 테마 공간입니다.", "동물원": "동물을 관람하고 체험하는 가족 여행 장소입니다.",
    "아쿠아리움": "해양 생물을 관람하는 실내 체험 장소입니다.", "공원": "산책과 휴식을 즐기기 좋은 야외 공간입니다.",
    "정원": "식물과 조경을 감상하며 걷기 좋은 공간입니다.", "쇼핑몰": "쇼핑과 식사를 함께 해결할 수 있는 복합 공간입니다.",
    "백화점": "브랜드 쇼핑과 식음 시설이 모인 대형 매장입니다.", "시장": "현지 먹거리와 생활 문화를 둘러보기 좋은 시장입니다.",
    "문화 공간": "공연·전시·지역 문화를 경험하는 공간입니다.", "공연장": "연극이나 공연을 관람하는 문화 시설입니다.",
  };
  return descriptions[categoryLabel] ?? `${categoryLabel} 유형으로 등록된 여행 장소입니다.`;
}

function koreanCuisine(value: string | undefined): string | null {
  if (!value) return null;
  const labels: Record<string, string> = {
    korean: "한식", japanese: "일식", sushi: "스시", ramen: "라멘", chinese: "중식",
    italian: "이탈리아식", french: "프랑스식", indian: "인도식", thai: "태국식", vietnamese: "베트남식",
    mexican: "멕시코식", vegetarian: "채식", vegan: "비건", seafood: "해산물", pizza: "피자",
    burger: "버거", coffee_shop: "커피", dessert: "디저트", cake: "케이크", bakery: "베이커리",
  };
  const translated = value.split(";").map((item) => labels[item.trim().toLowerCase()] ?? item.trim()).filter(Boolean);
  return translated.length ? translated.join(" · ") : null;
}

function placeFeatures(tags: Record<string, string>): string[] {
  const features: string[] = [];
  if (tags.outdoor_seating === "yes") features.push("야외 좌석");
  if (tags.takeaway === "yes") features.push("포장 가능");
  if (tags.delivery === "yes") features.push("배달 가능");
  if (tags.reservation === "yes") features.push("예약 가능");
  if (tags.wheelchair === "yes") features.push("휠체어 접근");
  if (/^(wlan|yes|free)$/.test(tags.internet_access ?? "")) features.push("Wi-Fi");
  return features.slice(0, 4);
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
    bakery: "베이커리", ice_cream: "아이스크림 가게",
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
