"use client";

import { useEffect, useMemo, useState } from "react";

import { buildSkyscannerFlightUrl, inferAirportCode, normalizeAirportCode } from "@/lib/airports";
import type { TravelPlace } from "@/types";

type ForecastDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number;
};

type ForecastResponse = {
  success: boolean;
  data: { available: boolean; availableFrom: string | null; days: ForecastDay[] } | null;
  message: string | null;
};

export function TravelPreparationHub({
  startDate,
  endDate,
  countryCode,
  destinationLabel,
  latitude,
  longitude,
  places,
}: {
  startDate: string;
  endDate: string;
  countryCode: string;
  destinationLabel: string;
  latitude: number;
  longitude: number;
  places: TravelPlace[];
}) {
  const inferredDestination = useMemo(() => inferAirportCode(
    places.flatMap((place) => [place.city?.nameKo, place.city?.nameEn]),
    countryCode,
  ), [countryCode, places]);
  const [origin, setOrigin] = useState("SEL");
  const [destination, setDestination] = useState(inferredDestination);
  const [forecast, setForecast] = useState<ForecastResponse["data"]>(null);
  const [weatherState, setWeatherState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      startDate,
      endDate,
    });
    fetch(`/api/weather/forecast?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as ForecastResponse;
        if (!response.ok || !body.success || !body.data) throw new Error(body.message ?? "forecast failed");
        setForecast(body.data);
        setWeatherState("ready");
      })
      .catch((error) => {
        if (error instanceof Error && error.name === "AbortError") return;
        setWeatherState("error");
      });
    return () => controller.abort();
  }, [endDate, latitude, longitude, startDate]);

  const rainyDays = forecast?.days.filter((day) => day.precipitationProbability >= 60 || isRainCode(day.weatherCode)) ?? [];
  const flightReady = origin.length === 3 && destination.length === 3;

  function updateOrigin(value: string) {
    const next = normalizeAirportCode(value);
    setOrigin(next);
  }

  return (
    <section className="trip-preparation" aria-labelledby="trip-preparation-heading">
      <header className="trip-preparation__heading">
        <div><p className="eyebrow">Trip assistant</p><h2 id="trip-preparation-heading">예약부터 변수 대응까지, 한곳에서</h2></div>
        <p>{formatDateRange(startDate, endDate)} · {destinationLabel}</p>
      </header>

      <div className="trip-preparation__grid">
        <article className="trip-action-card is-flight">
          <div className="trip-action-card__icon" aria-hidden="true">↗</div>
          <div className="trip-action-card__copy"><span>항공권</span><h3>저장한 날짜로 바로 검색</h3><p>날짜를 다시 입력하지 않고 스카이스캐너에서 비교해 보세요.</p></div>
          <div className="trip-flight-route">
            <label><span>출발</span><input value={origin} onChange={(event) => updateOrigin(event.target.value)} aria-label="출발 공항 코드" placeholder="SEL" /></label>
            <span aria-hidden="true">→</span>
            <label><span>도착</span><input value={destination} onChange={(event) => setDestination(normalizeAirportCode(event.target.value))} aria-label="도착 공항 코드" placeholder="TYO" /></label>
          </div>
          {flightReady ? <a className="trip-action-card__button" href={buildSkyscannerFlightUrl({ origin, destination, outboundDate: startDate, inboundDate: endDate })} target="_blank" rel="noreferrer">이 일정으로 항공권 찾기 <span aria-hidden="true">↗</span></a> : <p className="trip-action-card__notice">출발·도착 공항의 영문 코드 3자리를 입력해 주세요.</p>}
          <small>검색은 버튼을 누를 때만 실행되며 예약은 스카이스캐너에서 진행됩니다.</small>
        </article>

        <article className={`trip-action-card is-weather${rainyDays.length ? " has-alert" : ""}`}>
          <div className="trip-action-card__icon" aria-hidden="true">☂</div>
          <div className="trip-action-card__copy"><span>날씨 대응</span><h3>{weatherHeading(weatherState, forecast, rainyDays)}</h3><p>{weatherDescription(weatherState, forecast, rainyDays)}</p></div>
          {weatherState === "loading" ? <div className="trip-weather-skeleton" aria-label="여행지 날씨 확인 중" /> : null}
          {weatherState === "error" ? <p className="trip-action-card__notice">예보 연결이 원활하지 않아요. 잠시 후 다시 확인해 주세요.</p> : null}
          {rainyDays.length ? <ul className="trip-weather-days">{rainyDays.map((day) => {
            const matchingPlaces = places.filter((place) => place.visitedAt === day.date && !place.placeName.includes("장소를 골라주세요"));
            return <li key={day.date}><span><b>{formatMonthDay(day.date)}</b><small>비 {day.precipitationProbability}%</small></span><p>{matchingPlaces.length ? `${matchingPlaces[0].placeName}${matchingPlaces.length > 1 ? ` 외 ${matchingPlaces.length - 1}곳` : ""}` : "아직 비어 있는 일정"}</p></li>;
          })}</ul> : null}
          {rainyDays.length ? <a className="trip-action-card__button is-secondary" href="#itinerary-editor">비 오는 날 일정 점검하기 <span aria-hidden="true">↓</span></a> : null}
          <small>예보는 출발 16일 전부터 제공되며 여행지 현지 시간 기준입니다. 날씨 데이터: <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></small>
        </article>

        <article className="trip-action-card is-share">
          <div className="trip-action-card__icon" aria-hidden="true">⌘</div>
          <div className="trip-action-card__copy"><span>함께 만들기</span><h3>계획을 다듬고 기록으로 전환</h3><p>공유받은 일정도 내 날짜에 맞춰 담고, 다녀온 뒤에는 그대로 지구본에 남길 수 있어요.</p></div>
          <div className="trip-flow" aria-label="여행 계획 흐름"><span>발견</span><i>→</i><span>계획</span><i>→</i><span>기록</span></div>
          <a className="trip-action-card__button is-secondary" href="#itinerary-editor">일차별 일정 이어서 채우기 <span aria-hidden="true">↓</span></a>
          <small>공개하기 전까지 계획과 예약 정보는 나에게만 보입니다.</small>
        </article>
      </div>
    </section>
  );
}

function weatherHeading(state: "loading" | "ready" | "error", forecast: ForecastResponse["data"], rainyDays: ForecastDay[]): string {
  if (state === "loading") return "여행 날짜의 변수를 확인 중";
  if (state === "error") return "예보를 불러오지 못했어요";
  if (!forecast?.available) return "출발이 가까워지면 알려드릴게요";
  if (rainyDays.length) return `${rainyDays.length}일의 비 소식이 있어요`;
  return "현재는 큰 비 소식이 없어요";
}

function weatherDescription(state: "loading" | "ready" | "error", forecast: ForecastResponse["data"], rainyDays: ForecastDay[]): string {
  if (state === "loading") return "일정에 영향을 줄 수 있는 날씨를 미리 살펴보고 있어요.";
  if (state === "error") return "일정은 그대로 안전하게 보관되어 있습니다.";
  if (!forecast?.available) return forecast?.availableFrom ? `${formatKoreanDate(forecast.availableFrom)}부터 실제 예보와 일정 점검을 시작할 수 있어요.` : "출발 16일 전부터 실제 예보를 확인할 수 있어요.";
  if (rainyDays.length) return "해당 날짜의 야외 일정을 확인하고 실내 후보를 하나 준비해 두세요.";
  return "예보가 바뀌면 이 카드에서 바로 확인할 수 있어요.";
}

function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

function formatDateRange(start: string, end: string): string {
  return start === end ? formatKoreanDate(start) : `${formatKoreanDate(start)} – ${formatKoreanDate(end)}`;
}

function formatKoreanDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}

function formatMonthDay(value: string): string {
  const [, month, day] = value.split("-").map(Number);
  return `${month}/${day}`;
}
