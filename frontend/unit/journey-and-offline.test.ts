import { expect, test } from "@playwright/test";

import { angularDistanceDegrees, getFeatureCenter, normalizeLongitude } from "../src/components/globe/globe-geometry";
import { journeyGroups, nextJourneyAction } from "../src/lib/journey-next-action";
import { suggestVisitOrder } from "../src/lib/itinerary-order";
import { applyQueuedPlaceUpdates } from "../src/lib/travel-offline";
import { validateUsername } from "../src/lib/username";
import type { CountryFeature } from "../src/lib/globe-geo";
import type { OwnedTravelSummary, TravelDetail } from "../src/types";

function trip(id: number, startDate: string, endDate: string, visibility: "PUBLIC" | "PRIVATE", updatedAt = "2099-01-01T00:00:00Z") {
  return { visibility, updatedAt, travel: { id, startDate, endDate } } as unknown as OwnedTravelSummary;
}

test("다음 할 일은 여행 중 → 가장 가까운 계획 → 기록 안 한 지난 여행 순서로 고른다", () => {
  const today = "2099-05-10";
  const travels = [
    trip(1, "2099-04-01", "2099-04-03", "PRIVATE"),
    trip(2, "2099-06-01", "2099-06-03", "PRIVATE"),
    trip(3, "2099-05-20", "2099-05-22", "PRIVATE"),
    trip(4, "2099-03-01", "2099-03-02", "PUBLIC"),
  ];
  expect(nextJourneyAction(travels, today)).toMatchObject({ phase: "plan", href: "/studio/travels/3/edit?plan=1" });
  expect(nextJourneyAction([...travels, trip(5, "2099-05-09", "2099-05-11", "PRIVATE")], today))
    .toMatchObject({ phase: "travel", href: "/studio/travels/5/go?date=2099-05-10" });
  expect(nextJourneyAction([travels[0], travels[3]], today)).toMatchObject({ phase: "record", href: "/studio/travels/1/edit?finish=1" });
  expect(nextJourneyAction([travels[3]], today)).toBeNull();
  const groups = journeyGroups(travels, today);
  expect(groups.plans.map((item) => item.travel.id)).toEqual([3, 2]);
  expect(groups.records.map((item) => item.travel.id)).toEqual([4]);
});

test("방문 순서 제안은 양 끝을 고정하고 이동 거리를 줄인다", () => {
  const stops = [0, 3, 1, 4].map((longitude) => ({ key: String(longitude), latitude: 0, longitude }));
  const result = suggestVisitOrder(stops);
  expect(result.ordered.map((stop) => stop.key)).toEqual(["0", "1", "3", "4"]);
  expect(result.afterKm).toBeLessThan(result.beforeKm);
});

test("오프라인에서 쌓인 메모·완료 변경을 서버 응답 위에 다시 적용한다", () => {
  const travel = { places: [{ id: 1, memo: null, completedAt: null }, { id: 2, memo: "원래", completedAt: "2099-05-01T01:00:00Z" }] } as unknown as TravelDetail;
  const result = applyQueuedPlaceUpdates(travel, [
    { id: "a", placeId: 1, memo: "현장 메모", completed: true, createdAt: "2099-05-01T02:00:00Z" },
    { id: "b", placeId: 2, memo: "원래", completed: false, createdAt: "2099-05-01T03:00:00Z" },
  ]);
  expect(result.places).toEqual([
    { id: 1, memo: "현장 메모", completedAt: "2099-05-01T02:00:00Z" },
    { id: 2, memo: "원래", completedAt: null },
  ]);
  expect(travel.places[0].memo).toBeNull();
});

test("사용자명은 형식과 예약어를 함께 검사한다", () => {
  expect(validateUsername("Kyoto_Walker")).toBeNull();
  expect(validateUsername("")).toContain("입력");
  expect(validateUsername(".dot")).toContain("2~30자");
  expect(validateUsername("Studio")).toContain("서비스에서 사용하는 이름");
});

test("지구본 좌표 계산은 경도를 감싸고 가장 큰 영역의 중심을 쓴다", () => {
  expect(normalizeLongitude(190)).toBeCloseTo(-170);
  expect(normalizeLongitude(-540)).toBeCloseTo(-180, 5);
  expect(angularDistanceDegrees(0, 0, 0, 90)).toBeCloseTo(90);
  const square = (lng: number, lat: number, size: number) => [[[lng, lat], [lng + size, lat], [lng + size, lat + size], [lng, lat + size], [lng, lat]]];
  const feature = {
    type: "Feature",
    properties: { iso2: "XX", nameEn: "Example" },
    geometry: { type: "MultiPolygon", coordinates: [square(0, 0, 1), square(10, 10, 4)] },
  } as unknown as CountryFeature;
  const center = getFeatureCenter(feature)!;
  expect(center.lng).toBeCloseTo(12, 0);
  expect(center.lat).toBeCloseTo(12, 0);
});
