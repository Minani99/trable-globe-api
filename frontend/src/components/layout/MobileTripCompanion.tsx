"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { TravelDetail, TravelPlace } from "@/types";

type ForecastDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number;
};

type ForecastResponse = {
  success: boolean;
  data: { available: boolean; days: ForecastDay[] } | null;
};

export function MobileTripCompanion({
  travel,
  today,
  variant = "sheet",
}: {
  travel: TravelDetail;
  today: string;
  variant?: "sheet" | "page";
}) {
  const [forecast, setForecast] = useState<ForecastDay | null>(null);
  const dayNumber = Math.max(1, Math.min(travel.durationDays, differenceInDays(travel.startDate, today) + 1));
  const todaysPlaces = useMemo(() => placesForDay(travel.places, today), [today, travel.places]);
  const nextPlace = useMemo(() => findNextPlace(todaysPlaces), [todaysPlaces]);
  const location = todaysPlaces[0] ?? travel.places[0];

  useEffect(() => {
    if (!location) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      startDate: today,
      endDate: today,
    });
    fetch(`/api/weather/forecast?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as ForecastResponse;
        if (response.ok && body.success && body.data?.available) {
          setForecast(body.data.days.find((day) => day.date === today) ?? null);
        }
      })
      .catch((error) => {
        if (!(error instanceof Error && error.name === "AbortError")) setForecast(null);
      });
    return () => controller.abort();
  }, [location, today]);

  const editPath = `/studio/travels/${travel.id}/edit`;
  return (
    <section className={`mobile-trip-companion is-${variant}`} aria-labelledby={`mobile-trip-${variant}-${travel.id}`}>
      <header className="mobile-trip-companion__heading">
        <div>
          <span>DAY {dayNumber} · {formatShortDate(today)}</span>
          <h2 id={`mobile-trip-${variant}-${travel.id}`}>오늘 일정</h2>
        </div>
        {forecast ? (
          <p className={isRain(forecast) ? "has-rain" : undefined}>
            <strong>{weatherIcon(forecast.weatherCode)}</strong>
            <span>{formatTemperature(forecast)} · 비 {forecast.precipitationProbability}%</span>
          </p>
        ) : null}
      </header>

      {nextPlace ? (
        <a className="mobile-trip-companion__next" href={googleMapsUrl(nextPlace)} target="_blank" rel="noreferrer">
          <span>{isFuturePlace(nextPlace) ? "다음 일정" : "마지막 일정"}</span>
          <strong>{formatTime(nextPlace.startTime) ?? "시간 미정"} · {nextPlace.placeName}</strong>
          <small>지도에서 위치 보기 <b aria-hidden="true">↗</b></small>
        </a>
      ) : (
        <div className="mobile-trip-companion__empty">
          <strong>오늘 정해진 장소가 없어요.</strong>
          <p>현재 위치에서 장소를 추가하거나 전체 계획을 확인하세요.</p>
        </div>
      )}

      {todaysPlaces.length ? (
        <ol className="mobile-trip-companion__timeline" aria-label={`${travel.title} 오늘 일정`}>
          {todaysPlaces.map((place) => (
            <li key={place.id} className={place.id === nextPlace?.id ? "is-next" : undefined}>
              <time>{formatTime(place.startTime) ?? "--:--"}</time>
              <span aria-hidden="true" />
              <a href={googleMapsUrl(place)} target="_blank" rel="noreferrer">
                <strong>{place.placeName}</strong>
                <small>{place.city?.nameKo ?? place.country.nameKo}{place.durationMinutes ? ` · ${formatDuration(place.durationMinutes)}` : ""}</small>
              </a>
            </li>
          ))}
        </ol>
      ) : null}

      <nav className="mobile-trip-companion__actions" aria-label="여행 중 바로 기록">
        <Link href={`${editPath}#travel-place-editor`}><QuickActionIcon name="place" /><strong>장소</strong></Link>
        <Link href={`${editPath}#travel-photo-editor`}><QuickActionIcon name="photo" /><strong>사진</strong></Link>
        <Link href={`${editPath}#travel-note-editor`}><QuickActionIcon name="note" /><strong>메모</strong></Link>
        <Link href={editPath}><QuickActionIcon name="more" /><strong>전체</strong></Link>
      </nav>
    </section>
  );
}

function QuickActionIcon({ name }: { name: "place" | "photo" | "note" | "more" }) {
  if (name === "place") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2" /></svg>;
  }
  if (name === "photo") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m5.5 17 4.3-4 2.9 2.5 2.4-2.2 3.4 3.7" /></svg>;
  }
  if (name === "note") {
    return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 4.5h14v15H5z" /><path d="M8 9h8M8 12.5h8M8 16h5" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="6" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="18" cy="12" r="1.3" /></svg>;
}

function placesForDay(places: TravelPlace[], today: string): TravelPlace[] {
  return places
    .filter((place) => place.visitedAt === today && !place.placeName.includes("장소를 골라주세요"))
    .sort((left, right) => (formatTime(left.startTime) ?? "99:99").localeCompare(formatTime(right.startTime) ?? "99:99") || left.sortOrder - right.sortOrder);
}

function findNextPlace(places: TravelPlace[]): TravelPlace | null {
  if (!places.length) return null;
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  return places.find((place) => {
    const startTime = formatTime(place.startTime);
    return startTime && startTime >= currentTime;
  }) ?? places.at(-1) ?? null;
}

function isFuturePlace(place: TravelPlace): boolean {
  if (!place.startTime) return true;
  const now = new Date();
  return (formatTime(place.startTime) ?? "99:99") >= `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function formatTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function googleMapsUrl(place: TravelPlace): string {
  const query = `${place.latitude},${place.longitude} (${place.placeName})`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function differenceInDays(startDate: string, endDate: string): number {
  return Math.round((Date.parse(`${endDate}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${Number(month)}월 ${Number(day)}일`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}시간 ${remainder}분` : `${hours}시간`;
}

function isRain(day: ForecastDay): boolean {
  return day.precipitationProbability >= 60 || (day.weatherCode >= 51 && day.weatherCode <= 67) || (day.weatherCode >= 80 && day.weatherCode <= 82) || day.weatherCode >= 95;
}

function weatherIcon(code: number): string {
  if (code >= 95) return "⛈";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "☂";
  if (code >= 71 && code <= 77) return "❄";
  if (code <= 1) return "☀";
  return "☁";
}

function formatTemperature(day: ForecastDay): string {
  if (day.temperatureMax == null) return "오늘 날씨";
  return `${Math.round(day.temperatureMax)}°`;
}
