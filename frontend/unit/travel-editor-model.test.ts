import { expect, test } from "@playwright/test";

import {
  createWeatherReplanProposal,
  datesBetween,
  emptyPlace,
  estimatedEndTime,
  findRouteAnchor,
  inferPhotoSchedule,
  nextPlanningTime,
  planDayInsertionIndex,
  recommendationPreferences,
  toPhotoInput,
  toPlaceInput,
  type PlaceDraft,
} from "../src/components/studio/travel-editor-model";
import type { CountryOption } from "../src/lib/countries";
import type { WeatherDay } from "../src/lib/weather";

const japan: CountryOption = {
  iso2Code: "JP", iso3Code: "JPN", nameEn: "Japan", nameKo: "일본", latitude: 36.2, longitude: 138.25, label: "일본 · Japan",
};

function place(overrides: Partial<PlaceDraft>): PlaceDraft {
  return { ...emptyPlace("JP"), placeName: "장소", latitude: "35", longitude: "135.7", ...overrides };
}

function day(date: string, weatherCode: number, precipitationProbability: number | null): WeatherDay {
  return { date, weatherCode, temperatureMax: 20, temperatureMin: 12, precipitationProbability, precipitationSum: null, source: "forecast" };
}

test("여행 기간의 날짜를 하루씩 만들고 31일에서 자른다", () => {
  expect(datesBetween("2099-03-30", "2099-04-02")).toEqual(["2099-03-30", "2099-03-31", "2099-04-01", "2099-04-02"]);
  expect(datesBetween("2099-01-01", "2099-03-31")).toHaveLength(31);
  expect(datesBetween("2099-04-02", "2099-04-01")).toEqual([]);
  expect(datesBetween("", "2099-04-01")).toEqual([]);
});

test("새 장소는 같은 날 마지막 뒤, 없으면 더 늦은 날 앞에 들어간다", () => {
  const places = [place({ visitedAt: "2099-05-01" }), place({ visitedAt: "2099-05-01" }), place({ visitedAt: "2099-05-03" })];
  expect(planDayInsertionIndex(places, "2099-05-01")).toBe(2);
  expect(planDayInsertionIndex(places, "2099-05-02")).toBe(2);
  expect(planDayInsertionIndex(places, "2099-05-04")).toBe(3);
});

test("다음 일정 시간은 마지막 일정 2시간 뒤이며 자정을 넘기지 않는다", () => {
  expect(nextPlanningTime([], "식사")).toBe("12:30");
  expect(nextPlanningTime(["09:00", "", "13:15"], "관광")).toBe("15:15");
  expect(nextPlanningTime(["23:00"], "카페")).toBe("23:45");
});

test("끝나는 시간은 머무는 시간을 더하고 다음 날로 넘어가면 표시한다", () => {
  expect(estimatedEndTime("10:30", "90")).toBe("12:00");
  expect(estimatedEndTime("23:00", "120")).toBe("01:00 · 다음 날");
  expect(estimatedEndTime("", "60")).toBe("");
});

test("사진 위치가 100km 안의 장소에 연결되고 촬영일이 비면 그 장소의 날짜를 쓴다", () => {
  const places = [
    place({ placeName: "교토역", latitude: "34.9858", longitude: "135.7588", visitedAt: "2099-05-01" }),
    place({ placeName: "오사카성", latitude: "34.6873", longitude: "135.5262", visitedAt: "2099-05-02" }),
  ];
  expect(inferPhotoSchedule({ takenAt: null, latitude: 34.69, longitude: 135.53, dateSource: null }, places, "2099-05-01", "2099-05-02"))
    .toEqual({ takenAt: "2099-05-02", placeIndex: "1" });
  // Far from every stop, and taken outside the trip: nothing is guessed.
  expect(inferPhotoSchedule({ takenAt: "2099-06-01", latitude: 37.56, longitude: 126.97, dateSource: "exif" }, places, "2099-05-01", "2099-05-02"))
    .toEqual({ takenAt: "", placeIndex: "" });
  // No location: the first stop of the photo's day.
  expect(inferPhotoSchedule({ takenAt: "2099-05-02", latitude: null, longitude: null, dateSource: "exif" }, places, "2099-05-01", "2099-05-02"))
    .toEqual({ takenAt: "2099-05-02", placeIndex: "1" });
});

test("동선 기준점은 같은 날 앞 장소를 먼저 보고 미정 장소는 건너뛴다", () => {
  const places = [
    place({ placeName: "전날 숙소", latitude: "1", longitude: "1", visitedAt: "2099-05-01" }),
    place({ placeName: "점심 · 장소를 골라주세요", latitude: "9", longitude: "9", visitedAt: "2099-05-02" }),
    place({ placeName: "오전 명소", latitude: "2", longitude: "2", visitedAt: "2099-05-02" }),
    place({ placeName: "지금 고르는 곳", visitedAt: "2099-05-02" }),
  ];
  expect(findRouteAnchor(places, 3)).toEqual({ latitude: 2, longitude: 2 });
  expect(findRouteAnchor(places, 2)).toEqual({ latitude: 1, longitude: 1 });
  expect(findRouteAnchor(places, 0)).toBeNull();
});

test("저장 요청은 나라·도시·시간을 API 형식으로 바꾸고 위치가 없으면 막는다", () => {
  const countries = new Map([[japan.iso2Code, japan]]);
  const input = toPlaceInput(place({ placeName: " 교토역 ", cityName: "교토", cityNameEn: "", visitedAt: "2099-05-01", startTime: "09:30", durationMinutes: "60", memo: "  " }), countries);
  expect(input).toMatchObject({
    country: { iso2Code: "JP", nameKo: "일본" },
    city: { nameEn: "교토", nameKo: "교토", latitude: 35, longitude: 135.7 },
    placeName: "교토역", visitedAt: "2099-05-01", startTime: "09:30", durationMinutes: 60, memo: null,
  });
  expect(() => toPlaceInput(place({ latitude: "" }), countries)).toThrow("지도에서 방문 위치");
  expect(() => toPlaceInput(place({ countryCode: "ZZ" }), countries)).toThrow("나라를 선택");
  expect(toPhotoInput({ ...emptyPlace("JP"), imageUrl: " https://a/b.jpg ", caption: "", takenAt: "", placeIndex: "2" } as never))
    .toEqual({ imageUrl: "https://a/b.jpg", caption: null, takenAt: null, placeIndex: 2 });
});

test("비 오는 날의 야외 일정은 맑은 날의 실내 일정과 맞바꾸자고 제안한다", () => {
  const places = [
    place({ key: "park", placeName: "아라시야마 대나무숲", visitedAt: "2099-05-01" }),
    place({ key: "museum", placeName: "교토 국립 박물관", visitedAt: "2099-05-02" }),
  ];
  const proposal = createWeatherReplanProposal(places, day("2099-05-01", 63, 80), [day("2099-05-01", 63, 80), day("2099-05-02", 1, 10)]);
  expect(proposal?.title).toBe("실내 일정과 야외 일정을 맞바꿨어요");
  expect(proposal?.afterPlaces.map((item) => [item.key, item.visitedAt])).toEqual([["park", "2099-05-02"], ["museum", "2099-05-01"]]);
  // The input itinerary is never modified in place.
  expect(places[0].visitedAt).toBe("2099-05-01");
});

test("바꿀 실내 일정이 없으면 기존 일정을 두고 실내 대안 자리만 추가한다", () => {
  const places = [place({ key: "park", placeName: "공원 산책", visitedAt: "2099-05-01" })];
  const proposal = createWeatherReplanProposal(places, day("2099-05-01", 63, null), [day("2099-05-01", 63, null)]);
  expect(proposal?.afterPlaces).toHaveLength(2);
  expect(proposal?.afterPlaces[1]).toMatchObject({ visitedAt: "2099-05-01", placeName: "실내 대안 · 장소를 골라주세요" });
  // A rainy day that is already all indoors needs no proposal.
  expect(createWeatherReplanProposal([place({ placeName: "미술관", visitedAt: "2099-05-01" })], day("2099-05-01", 63, 90), [])).toBeNull();
});

test("여행 소개 문구에서 취향 키워드를 찾는다", () => {
  expect(recommendationPreferences("부모님과 박물관, 맛집 투어")).toEqual(["food", "culture", "family"]);
  expect(recommendationPreferences("")).toEqual([]);
});
