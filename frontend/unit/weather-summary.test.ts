import { expect, test } from "@playwright/test";

import { weatherSummary, weatherTravelAdvice, type WeatherDay } from "../src/lib/weather";

function day(weatherCode: number, source: WeatherDay["source"] = "forecast"): WeatherDay {
  return { date: "2026-10-26", weatherCode, source, temperatureMax: 15, temperatureMin: 5, precipitationProbability: null, precipitationSum: null };
}

test("눈과 뇌우는 비 없음 안내 대신 이동과 야외 활동 안내를 제공한다", () => {
  expect(weatherSummary([day(71)])).toContain("눈 예보");
  expect(weatherTravelAdvice([day(85)])).toContain("미끄럼");
  expect(weatherSummary([day(71), day(95)])).toContain("뇌우 예보");
  expect(weatherTravelAdvice([day(71), day(95)])).toContain("실내 대안");
  expect(weatherTravelAdvice([day(61)])).toContain("우산");
});

test("과거 기록과 평년 자료를 실제 예보나 맑음으로 단정하지 않는다", () => {
  expect(weatherSummary([day(61, "observed")])).toContain("지난 날씨 기록");
  expect(weatherSummary([day(3, "climate")])).toContain("평년 날씨");
  expect(weatherTravelAdvice([day(95, "observed"), day(71, "climate")])).toBeNull();
  expect(weatherSummary([])).toContain("아직 없어요");
});

test("일부 날짜만 예보가 있어도 전체 기간에 비가 없다고 단정하지 않는다", () => {
  const days = [day(3), day(61, "climate")];
  expect(weatherSummary(days)).toBe("예보가 제공된 날짜의 날씨를 확인하세요");
  expect(weatherTravelAdvice(days)).toBeNull();
  expect(weatherTravelAdvice([{ ...day(3), precipitationProbability: 80 }])).toContain("우산");
});
