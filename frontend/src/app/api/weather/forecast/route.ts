import { NextRequest, NextResponse } from "next/server";

import { todayInKorea } from "@/lib/utils/date";
import type { TripWeather, WeatherDay, WeatherSource } from "@/lib/weather";

/*
 * Trip weather for every day we can say something useful about.
 *
 * - Recent past days (about three months) and the next two weeks come from the Open-Meteo
 *   forecast API (one request).
 * - Older past days come from the historical archive.
 * - Days beyond the forecast horizon get a climate outlook: the same calendar
 *   dates averaged over the previous five years, so a trip planned months ahead
 *   still shows the typical temperature and how often it rains.
 */
// The forecast API keeps 92 past days; two days of margin cover destinations ahead of Korea.
const PAST_DAYS = 90;
// Open-Meteo allows 16 forecast days counted in the destination's time zone.
// Stopping at today + 14 (Korea time) keeps the request valid for destinations
// that are a day behind Korea; the remaining day falls back to the climate outlook.
const FORECAST_HORIZON_DAYS = 14;
const CLIMATE_YEARS = 5;
const MAX_TRIP_DAYS = 31;
const FORECAST_REVALIDATE_SECONDS = 30 * 60;
const ARCHIVE_REVALIDATE_SECONDS = 7 * 24 * 60 * 60;

type OpenMeteoDaily = {
  daily?: {
    time?: string[];
    weather_code?: Array<number | null>;
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
};

type DailyRow = {
  date: string;
  weatherCode: number | null;
  temperatureMax: number | null;
  temperatureMin: number | null;
  precipitationProbability: number | null;
  precipitationSum: number | null;
};

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("latitude") || NaN);
  const longitude = Number(request.nextUrl.searchParams.get("longitude") || NaN);
  const startDate = request.nextUrl.searchParams.get("startDate") ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate") ?? "";

  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    || !isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) {
    return NextResponse.json(
      { success: false, data: null, message: "날씨를 확인할 여행 위치와 날짜가 올바르지 않습니다." },
      { status: 400 },
    );
  }

  // Weather does not change across a kilometre; rounding lets nearby places share a cache entry.
  const lat = round(latitude, 2);
  const lon = round(longitude, 2);
  const today = todayInKorea();
  const forecastFrom = addDays(today, -PAST_DAYS);
  const forecastTo = addDays(today, FORECAST_HORIZON_DAYS);
  const lastDate = minDate(endDate, addDays(startDate, MAX_TRIP_DAYS - 1));
  const dates = datesBetween(startDate, lastDate);
  const recentDates = dates.filter((date) => date >= forecastFrom && date <= forecastTo);
  const laterDates = dates.filter((date) => date > forecastTo);
  const olderDates = dates.filter((date) => date < forecastFrom);

  const [recent, later, older] = await Promise.allSettled([
    recentDates.length ? fetchForecast(lat, lon, recentDates[0], recentDates.at(-1)!) : Promise.resolve([]),
    laterDates.length ? fetchClimateOutlook(lat, lon, laterDates) : Promise.resolve([]),
    olderDates.length ? fetchArchive(lat, lon, olderDates[0], olderDates.at(-1)!) : Promise.resolve([]),
  ]);

  const failures = [recent, later, older].filter((result) => result.status === "rejected");
  if (failures.length) console.error("[weather] some weather requests failed", failures.map((failure) => (failure as PromiseRejectedResult).reason));

  const days: WeatherDay[] = [
    ...(recent.status === "fulfilled" ? recent.value.map((row) => toDay(row, row.date < today ? "observed" : "forecast")) : []),
    ...(later.status === "fulfilled" ? later.value.map((row) => toDay(row, "climate")) : []),
    ...(older.status === "fulfilled" ? older.value.map((row) => toDay(row, "observed")) : []),
  ].filter((day): day is WeatherDay => day !== null).sort((a, b) => a.date.localeCompare(b.date));

  if (!days.length && failures.length) {
    return NextResponse.json(
      { success: false, data: null, message: "여행지 날씨를 잠시 불러오지 못했습니다." },
      { status: 502 },
    );
  }

  const data: TripWeather = {
    available: days.length > 0,
    availableFrom: startDate > forecastTo ? addDays(startDate, -FORECAST_HORIZON_DAYS) : null,
    days,
  };
  return NextResponse.json(
    { success: true, data, message: null },
    // Partial answers are cached briefly so a recovered upstream fills the gap soon.
    { headers: { "Cache-Control": `public, max-age=${failures.length ? 60 : 600}, stale-while-revalidate=1800` } },
  );
}

async function fetchForecast(latitude: number, longitude: number, startDate: string, endDate: string): Promise<DailyRow[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum",
    timezone: "auto",
    start_date: startDate,
    end_date: endDate,
  });
  return readDaily(`https://api.open-meteo.com/v1/forecast?${params}`, FORECAST_REVALIDATE_SECONDS);
}

async function fetchArchive(latitude: number, longitude: number, startDate: string, endDate: string): Promise<DailyRow[]> {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
    timezone: "auto",
    start_date: startDate,
    end_date: endDate,
  });
  return readDaily(`https://archive-api.open-meteo.com/v1/archive?${params}`, ARCHIVE_REVALIDATE_SECONDS);
}

/** Averages the same trip dates over the previous years, aligned by day offset. */
async function fetchClimateOutlook(latitude: number, longitude: number, dates: string[]): Promise<DailyRow[]> {
  const years = await Promise.allSettled(Array.from({ length: CLIMATE_YEARS }, (_, index) => {
    const start = shiftYears(dates[0], -(index + 1));
    return fetchArchive(latitude, longitude, start, addDays(start, dates.length - 1));
  }));
  const samples = years.flatMap((year) => year.status === "fulfilled" ? [year.value] : []);
  if (!samples.length) throw (years[0] as PromiseRejectedResult).reason;

  return dates.map((date, offset) => {
    const rows = samples.map((rowsForYear) => rowsForYear[offset]).filter((row): row is DailyRow => Boolean(row));
    const sums = finite(rows.map((row) => row.precipitationSum));
    const wetShare = sums.length ? sums.filter((sum) => sum >= 1).length / sums.length : null;
    return {
      date,
      weatherCode: climateCode(finite(rows.map((row) => row.weatherCode)), wetShare),
      temperatureMax: mean(finite(rows.map((row) => row.temperatureMax))),
      temperatureMin: mean(finite(rows.map((row) => row.temperatureMin))),
      precipitationProbability: wetShare == null ? null : Math.round(wetShare * 100),
      precipitationSum: mean(sums),
    };
  });
}

async function readDaily(url: string, revalidate: number): Promise<DailyRow[]> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const daily = (await response.json() as OpenMeteoDaily).daily;
  return (daily?.time ?? []).map((date, index) => ({
    date,
    weatherCode: daily?.weather_code?.[index] ?? null,
    temperatureMax: daily?.temperature_2m_max?.[index] ?? null,
    temperatureMin: daily?.temperature_2m_min?.[index] ?? null,
    precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null,
    precipitationSum: daily?.precipitation_sum?.[index] ?? null,
  }));
}

function toDay(row: DailyRow, source: WeatherSource): WeatherDay | null {
  if (row.weatherCode == null && row.temperatureMax == null) return null;
  return {
    date: row.date,
    weatherCode: row.weatherCode ?? 3,
    temperatureMax: row.temperatureMax == null ? null : round(row.temperatureMax, 1),
    temperatureMin: row.temperatureMin == null ? null : round(row.temperatureMin, 1),
    precipitationProbability: row.precipitationProbability,
    precipitationSum: row.precipitationSum == null ? null : round(row.precipitationSum, 1),
    source,
  };
}

/** Picks a representative WMO code for a set of past years. */
function climateCode(codes: number[], wetShare: number | null): number | null {
  if (!codes.length) return null;
  const precipitation = codes.filter((code) => code >= 51);
  if ((wetShare ?? precipitation.length / codes.length) >= 0.5 && precipitation.length) {
    const snowy = precipitation.filter((code) => (code >= 71 && code <= 77) || code === 85 || code === 86).length;
    return snowy > precipitation.length / 2 ? 71 : 61;
  }
  // Fog counts as overcast; the average of the dry years sets clear, partly cloudy or overcast.
  const cloudiness = mean(codes.filter((code) => code < 51).map((code) => Math.min(code, 3))) ?? 3;
  return cloudiness <= 1 ? 1 : cloudiness <= 2.2 ? 2 : 3;
}

function finite(values: Array<number | null>): number[] {
  return values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function shiftYears(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCFullYear(date.getUTCFullYear() + amount);
  return date.toISOString().slice(0, 10);
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}
