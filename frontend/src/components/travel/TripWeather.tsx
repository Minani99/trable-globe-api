"use client";

import { useEffect, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/common/AppIcon";

import { forecastRequest, clearForecast, type Forecast } from "@/lib/weather-client";

export function TripWeather({ latitude, longitude, startDate, endDate, label }: {
  latitude: number; longitude: number; startDate: string; endDate: string; label: string;
}) {
  const url = `/api/weather/forecast?${new URLSearchParams({ latitude: String(latitude), longitude: String(longitude), startDate, endDate })}`;
  const [result, setResult] = useState<{ url: string; data: Forecast | null; error: boolean } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const current = result?.url === url ? result : null;
  useEffect(() => {
    let active = true;
    forecastRequest(url).then((data) => { if (active) setResult({ url, data, error: false }); })
      .catch(() => { if (active) setResult({ url, data: null, error: true }); });
    return () => { active = false; };
  }, [url, attempt]);
  const days = current?.data?.days ?? [];
  return <section className="trip-forecast" aria-label={`${label} 여행 날씨`}>
    <header><AppIcon name="sun" /><strong>{label} 날씨</strong><span>현지 날짜 기준</span></header>
    {!current ? <p role="status">예보를 확인하고 있어요…</p> : current.error ? <div className="trip-forecast__error"><p role="status">날씨를 불러오지 못했어요.</p><button type="button" onClick={() => { clearForecast(url); setResult(null); setAttempt((value) => value + 1); }}><AppIcon name="refresh" />다시 확인</button></div> : days.length ? <>
      <ul className="trip-forecast__days" aria-label="날짜별 예보">{days.map((day) => {
        const weather = describeWeather(day.weatherCode);
        return <li key={day.date} className={(day.precipitationProbability ?? 0) >= 60 ? "has-rain" : undefined}>
          <time dateTime={day.date}>{Number(day.date.slice(5, 7))}.{day.date.slice(8, 10)}</time>
          <AppIcon name={weather.icon} /><span>{weather.label}</span>
          <strong>{temperature(day.temperatureMin)} / {temperature(day.temperatureMax)}</strong>
          <small>강수 {day.precipitationProbability == null ? "미제공" : `${day.precipitationProbability}%`}</small>
        </li>;
      })}</ul>
      {days.at(-1)!.date < endDate ? <p>현재 {days.at(-1)!.date}까지 예보가 있어요. 이후 날짜는 출발이 가까워지면 확인하세요.</p> : null}
    </> : <p>{endDate < new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" }) ? "지난 날짜의 실시간 예보는 제공되지 않습니다." : `${current.data?.availableFrom ?? "출발 15일 전"}부터 예보를 확인할 수 있어요.`}</p>}
    <small className="trip-forecast__source">최대 16일 예보 · <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></small>
  </section>;
}
function temperature(value: number | null) { return value == null ? "—" : `${Math.round(value)}°`; }
function describeWeather(code: number | null): { icon: AppIconName; label: string } {
  if (code == null) return { icon: "cloud", label: "미제공" };
  if (code >= 95) return { icon: "rain", label: "뇌우" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { icon: "snow", label: "눈" };
  if (code >= 51) return { icon: "rain", label: "비" };
  if (code >= 45) return { icon: "cloud", label: "안개" };
  return code <= 1 ? { icon: "sun", label: "맑음" } : { icon: "cloud", label: "구름" };
}
