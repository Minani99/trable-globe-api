"use client";

import { AppIcon } from "@/components/common/AppIcon";
import { WeatherIcon } from "@/components/common/WeatherIcon";
import { formatRain, formatTemperatureRange, isRainyDay, useTripWeather, WEATHER_SOURCE_LABEL, weatherLabel } from "@/lib/weather";

/** Compact daily weather for the on-trip view; the planner keeps the full weather panel. */
export function TripWeather({ latitude, longitude, startDate, endDate, label }: {
  latitude: number; longitude: number; startDate: string; endDate: string; label: string;
}) {
  const state = useTripWeather({ latitude, longitude, startDate, endDate });
  const days = state.weather?.days ?? [];
  return <section className="trip-forecast" aria-label={`${label} 여행 날씨`}>
    <header><AppIcon name="weather-partly" /><strong>{label} 날씨</strong><span>현지 날짜 기준</span></header>
    {state.status === "loading" || state.status === "idle" ? <p role="status">예보를 확인하고 있어요…</p> : state.status === "error" ? <div className="trip-forecast__error"><p role="status">날씨를 불러오지 못했어요.</p><button type="button" onClick={state.refresh}><AppIcon name="refresh" />다시 확인</button></div> : days.length ? <>
      <ul className="trip-forecast__days" aria-label="날짜별 예보">{days.map((day) => <li key={day.date} className={isRainyDay(day) ? "has-rain" : undefined}>
        <time dateTime={day.date}>{Number(day.date.slice(5, 7))}.{day.date.slice(8, 10)}</time>
        <WeatherIcon code={day.weatherCode} /><span>{weatherLabel(day.weatherCode)}</span>
        <strong>{formatTemperatureRange(day)}</strong><small>{formatRain(day) ?? "강수 미제공"}</small>
        <small>{WEATHER_SOURCE_LABEL[day.source]}</small>
      </li>)}</ul>
    </> : <p>이 날짜의 날씨 정보가 아직 없습니다.</p>}
    <small className="trip-forecast__source">{days.some((day) => day.source === "climate") ? "평년: 최근 5년 같은 날짜 평균 · 실제 예보와 다릅니다. " : days.some((day) => day.source === "observed") ? "지난 날의 날씨 기록 · " : "실제 예보 · "}<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></small>
  </section>;
}
