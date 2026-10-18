import { NextRequest, NextResponse } from "next/server";

import { todayInKorea } from "@/lib/utils/date";

type OpenMeteoForecast = {
  daily?: {
    time?: string[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: Array<number | null>;
  };
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

  const today = todayInKorea();
  const forecastLimit = addDays(today, 15);
  if (endDate < addDays(today, -1) || startDate > addDays(forecastLimit, 1)) {
    return NextResponse.json({
      success: true,
      data: { available: false, availableFrom: addDays(startDate, -15), days: [] },
      message: null,
    });
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto",
    forecast_days: "16",
  });

  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 900 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
    const forecast = await response.json() as OpenMeteoForecast;
    const daily = forecast.daily;
    if (!Array.isArray(daily?.time) || daily.time.length === 0) throw new Error("Empty forecast response");
    const days = (daily?.time ?? []).map((date, index) => ({
      date,
      weatherCode: daily?.weather_code?.[index] ?? null,
      temperatureMax: daily?.temperature_2m_max?.[index] ?? null,
      temperatureMin: daily?.temperature_2m_min?.[index] ?? null,
      precipitationProbability: daily?.precipitation_probability_max?.[index] ?? null,
    })).filter((day) => day.date >= startDate && day.date <= endDate);
    return NextResponse.json({ success: true, data: { available: days.length > 0, availableFrom: addDays(startDate, -15), days }, message: null });
  } catch (error) {
    console.error("[weather] forecast request failed", error);
    return NextResponse.json(
      { success: false, data: null, message: "여행지 예보를 잠시 불러오지 못했습니다." },
      { status: 502 },
    );
  }
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

function addDays(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
