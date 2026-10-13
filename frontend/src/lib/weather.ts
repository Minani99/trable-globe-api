import { useEffect, useState } from "react";

import type { IconName } from "@/components/common/Icon";

/**
 * Where a day's weather comes from.
 * - forecast: Open-Meteo forecast (about two weeks ahead)
 * - observed: what actually happened on a past day
 * - climate: average of the same dates over recent years, for days beyond the forecast
 */
export type WeatherSource = "forecast" | "observed" | "climate";

export interface WeatherDay {
  date: string;
  weatherCode: number;
  temperatureMax: number | null;
  temperatureMin: number | null;
  /** Forecast chance of rain; for climate days, the share of past years with rain. */
  precipitationProbability: number | null;
  precipitationSum: number | null;
  source: WeatherSource;
}

export interface TripWeather {
  available: boolean;
  /** When a real forecast starts covering the trip, if it does not yet. */
  availableFrom: string | null;
  days: WeatherDay[];
}

type WeatherQuery = { latitude: number; longitude: number; startDate: string; endDate: string };

const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; promise: Promise<TripWeather> }>();

function cacheKey({ latitude, longitude, startDate, endDate }: WeatherQuery): string {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)},${startDate},${endDate}`;
}

/**
 * Loads weather for a date range. Requests for the same place and dates share one
 * network call, so the edit page's weather strip, day tabs and rain re-planner do
 * not each hit the API.
 */
export function fetchTripWeather(query: WeatherQuery): Promise<TripWeather> {
  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.promise;
  const params = new URLSearchParams({
    latitude: query.latitude.toFixed(2),
    longitude: query.longitude.toFixed(2),
    startDate: query.startDate,
    endDate: query.endDate,
  });
  const promise = fetch(`/api/weather/forecast?${params}`)
    .then(async (response) => {
      const body = await response.json() as { success: boolean; data: TripWeather | null; message: string | null };
      if (!response.ok || !body.success || !body.data) throw new Error(body.message ?? "weather request failed");
      return body.data;
    });
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

export type TripWeatherState =
  | { status: "idle" | "loading" | "error"; weather: null }
  | { status: "ready"; weather: TripWeather };

export function useTripWeather(query: Partial<WeatherQuery> | null): TripWeatherState {
  const valid = Boolean(query
    && Number.isFinite(query.latitude) && Number.isFinite(query.longitude)
    && isIsoDate(query.startDate) && isIsoDate(query.endDate) && query.startDate! <= query.endDate!);
  const key = valid ? cacheKey(query as WeatherQuery) : null;
  const [state, setState] = useState<{ key: string | null; value: TripWeatherState }>({ key: null, value: { status: "idle", weather: null } });

  useEffect(() => {
    if (!key || !query) return;
    let active = true;
    fetchTripWeather(query as WeatherQuery)
      .then((weather) => { if (active) setState({ key, value: { status: "ready", weather } }); })
      .catch(() => { if (active) setState({ key, value: { status: "error", weather: null } }); });
    return () => { active = false; };
    // The key captures every field of the query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!key) return { status: "idle", weather: null };
  return state.key === key ? state.value : { status: "loading", weather: null };
}

export function weatherIconName(code: number): IconName {
  if (code >= 95) return "weather-storm";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "weather-snow";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "weather-rain";
  if (code >= 51 && code <= 57) return "weather-drizzle";
  if (code === 45 || code === 48) return "weather-fog";
  if (code === 3) return "weather-cloudy";
  if (code === 2) return "weather-partly";
  return "weather-clear";
}

export function weatherLabel(code: number): string {
  if (code >= 95) return "뇌우";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 61 && code <= 67) return "비";
  if (code >= 51 && code <= 57) return "이슬비";
  if (code === 45 || code === 48) return "안개";
  if (code === 3) return "흐림";
  if (code === 2) return "구름 조금";
  return "맑음";
}

/** Tone used to colour the weather icon. */
export function weatherTone(code: number): "sun" | "cloud" | "rain" | "snow" | "storm" {
  const icon = weatherIconName(code);
  if (icon === "weather-storm") return "storm";
  if (icon === "weather-snow") return "snow";
  if (icon === "weather-rain" || icon === "weather-drizzle") return "rain";
  if (icon === "weather-clear") return "sun";
  return "cloud";
}

export function isRainCode(code: number): boolean {
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
}

export function isRainyDay(day: WeatherDay): boolean {
  if (isRainCode(day.weatherCode)) return true;
  if (day.source === "observed") return (day.precipitationSum ?? 0) >= 5;
  return (day.precipitationProbability ?? 0) >= 60;
}

export const WEATHER_SOURCE_LABEL: Record<WeatherSource, string> = {
  forecast: "예보",
  observed: "기록",
  climate: "평년",
};

export function formatTemperatureRange(day: WeatherDay): string {
  const max = day.temperatureMax == null ? null : Math.round(day.temperatureMax);
  const min = day.temperatureMin == null ? null : Math.round(day.temperatureMin);
  if (max == null && min == null) return "–";
  if (max == null) return `${min}°`;
  if (min == null) return `${max}°`;
  return `${max}° / ${min}°`;
}

export function formatRain(day: WeatherDay): string | null {
  if (day.source === "observed") {
    return day.precipitationSum == null ? null : `강수 ${Math.round(day.precipitationSum)}mm`;
  }
  return day.precipitationProbability == null ? null : `강수 ${Math.round(day.precipitationProbability)}%`;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
