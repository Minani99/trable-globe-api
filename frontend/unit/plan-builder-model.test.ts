import { expect, test } from "@playwright/test";

import {
  addDays,
  buildAutomaticPlaces,
  buildSkeletonPlaces,
  formatDuration,
  formatPlanDateLong,
  SCHEDULES,
  type PlanAnchor,
} from "../src/components/planner/plan-builder-model";
import type { CountryOption } from "../src/lib/countries";
import type { PlaceRecommendation } from "../src/lib/place-recommendations";

const japan: CountryOption = {
  iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2, longitude: 138.25, label: "일본 · Japan",
};
const anchor: PlanAnchor = { name: "교토역", city: "교토", latitude: 34.98, longitude: 135.75, source: "center" };

function recommendation(id: string, name: string): PlaceRecommendation {
  return {
    id, name, nameLocale: "ko", localName: null, city: "교토", label: name, description: `${name} 설명`,
    latitude: 35, longitude: 135.7, distanceKm: 1, categoryLabel: "명소", recommendationReason: "가까워요",
    openingHours: null, cuisine: null, stars: null, features: [],
  };
}

test("날짜 계산은 달과 해를 넘기고 일정 길이를 박·일로 표시한다", () => {
  expect(addDays("2099-01-31", 1)).toBe("2099-02-01");
  expect(addDays("2099-12-31", 1)).toBe("2100-01-01");
  expect(addDays("", 3)).toBe("");
  expect(formatDuration(1)).toBe("당일");
  expect(formatDuration(4)).toBe("3박 4일");
  expect(formatPlanDateLong("2026-10-26")).toBe("10월 26일 (월)");
});

test("빈 일정은 날마다 미정 장소 하나를 나라 중심에 둔다", () => {
  const places = buildSkeletonPlaces(japan, 2, "2099-05-01", ["맛집"], "느긋하게");
  expect(places.map((item) => [item.placeName, item.visitedAt])).toEqual([
    ["1일차 · 장소를 골라주세요", "2099-05-01"],
    ["2일차 · 장소를 골라주세요", "2099-05-02"],
  ]);
  expect(places[0]).toMatchObject({ latitude: japan.latitude, longitude: japan.longitude, city: null });
});

test("추천 일정은 일정 칸마다 다른 추천을 쓰고 모자라면 미정 장소로 채운다", () => {
  const { places, recommendationCount } = buildAutomaticPlaces({
    selectedCountry: japan,
    anchor,
    recommendations: { activity: [recommendation("a1", "기요미즈데라")], food: [recommendation("f1", "니시키 시장")], cafe: [], stay: [] },
    pace: "slow",
    tripDays: 2,
    startDate: "2099-05-01",
    styles: ["맛집"],
  });
  expect(places).toHaveLength(SCHEDULES.slow.length * 2);
  expect(recommendationCount).toBe(2);
  expect(places.map((item) => item.placeName)).toEqual([
    "기요미즈데라", "니시키 시장", "1일차 · 카페를 골라주세요",
    "2일차 · 할 거리를 골라주세요", "2일차 · 식사를 골라주세요", "2일차 · 카페를 골라주세요",
  ]);
  expect(places.map((item) => item.startTime)).toEqual(["10:00", "13:00", "16:00", "10:00", "13:00", "16:00"]);
  expect(new Set(places.map((item) => item.visitedAt))).toEqual(new Set(["2099-05-01", "2099-05-02"]));
});

test("꼭 가고 싶은 장소는 첫 할 거리 자리에 한 번만 들어간다", () => {
  const { places } = buildAutomaticPlaces({
    selectedCountry: japan,
    anchor: { ...anchor, name: "후시미 이나리", source: "content" },
    recommendations: { activity: [], food: [], cafe: [], stay: [] },
    pace: "full",
    tripDays: 1,
    startDate: "2099-05-01",
    styles: [],
  });
  expect(places.filter((item) => item.placeName === "후시미 이나리")).toHaveLength(1);
  expect(places[0].placeName).toBe("후시미 이나리");
});
