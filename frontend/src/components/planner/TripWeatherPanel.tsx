"use client";

import { Icon } from "@/components/common/Icon";
import { WeatherIcon } from "@/components/common/WeatherIcon";
import {
  formatRain,
  formatTemperatureRange,
  isRainyDay,
  useTripWeather,
  WEATHER_SOURCE_LABEL,
  weatherLabel,
  type TripWeather,
  type WeatherDay,
} from "@/lib/weather";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/**
 * Day-by-day weather for the whole trip, shown above the planning tabs so it is
 * visible whichever step the traveller is on. Days beyond the forecast range use
 * the climate outlook instead of staying blank.
 */
export function TripWeatherPanel({
  latitude,
  longitude,
  startDate,
  endDate,
  destinationLabel,
}: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
  destinationLabel: string;
}) {
  const state = useTripWeather({ latitude, longitude, startDate, endDate });
  const weather = state.weather;
  const days = weather?.days ?? [];
  const rainyForecast = days.filter((day) => day.source === "forecast" && isRainyDay(day));
  const sources = [...new Set(days.map((day) => day.source))];

  return (
    <section className="trip-weather" aria-labelledby="trip-weather-heading" aria-busy={state.status === "loading"}>
      <header className="trip-weather__header">
        <span className="trip-weather__badge" aria-hidden="true"><Icon name={rainyForecast.length ? "umbrella" : "weather-partly"} /></span>
        <div>
          <small>{destinationLabel} 날씨</small>
          <h2 id="trip-weather-heading">{heading(state.status, weather, rainyForecast)}</h2>
          <p>{description(state.status, weather, destinationLabel)}</p>
        </div>
        {rainyForecast.length ? (
          <a className="trip-weather__action" href="#itinerary-editor">비 오는 날 일정 점검</a>
        ) : null}
      </header>

      {state.status === "error" ? <button className="trip-weather__action" type="button" onClick={state.refresh}><Icon name="refresh" />다시 확인</button> : null}
      {state.status === "loading" ? (
        <ol className="trip-weather__days is-loading" aria-hidden="true">
          {datesBetween(startDate, endDate).slice(0, 7).map((date) => <li key={date} />)}
        </ol>
      ) : days.length ? (
        <ol className="trip-weather__days" aria-label="날짜별 날씨">
          {days.map((day) => <WeatherDayCard key={day.date} day={day} dayNumber={dayIndex(startDate, day.date) + 1} />)}
        </ol>
      ) : null}

      <footer className="trip-weather__footer">
        {sources.length ? (
          <ul aria-label="날씨 기준">
            {sources.includes("forecast") ? <li><b data-source="forecast">예보</b> 약 2주 앞까지의 실제 예보</li> : null}
            {sources.includes("climate") ? <li><b data-source="climate">평년</b> 최근 5년 같은 날짜 평균</li> : null}
            {sources.includes("observed") ? <li><b data-source="observed">기록</b> 지난 날의 실제 날씨</li> : null}
          </ul>
        ) : null}
        <small>현지 시간 기준 · 날씨 데이터 <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></small>
      </footer>
    </section>
  );
}

function WeatherDayCard({ day, dayNumber }: { day: WeatherDay; dayNumber: number }) {
  const rain = formatRain(day);
  const rainy = isRainyDay(day);
  return (
    <li className={`trip-weather-day${rainy ? " is-rainy" : ""}`} data-source={day.source}>
      <span className="trip-weather-day__date"><b>DAY {dayNumber}</b><time dateTime={day.date}>{formatDay(day.date)}</time></span>
      <WeatherIcon code={day.weatherCode} className="trip-weather-day__icon" />
      <strong>{formatTemperatureRange(day)}</strong>
      <span className="trip-weather-day__meta">{weatherLabel(day.weatherCode)}{rain ? ` · ${rain}` : ""}</span>
      <em>{WEATHER_SOURCE_LABEL[day.source]}</em>
    </li>
  );
}

function heading(status: string, weather: TripWeather | null, rainyForecast: WeatherDay[]): string {
  if (status === "loading" || status === "idle") return "여행 기간 날씨를 확인하고 있어요";
  if (status === "error" || !weather) return "날씨를 잠시 불러오지 못했어요";
  if (!weather.days.length) return "이 기간의 날씨 정보가 아직 없어요";
  if (rainyForecast.length) return `비 예보 ${rainyForecast.length}일 · 우산을 챙기세요`;
  if (weather.days.some((day) => day.source === "forecast")) return "여행 기간에 큰 비 소식은 없어요";
  const typicalRain = weather.days.filter((day) => day.source === "climate" && isRainyDay(day)).length;
  if (typicalRain) return `이맘때는 ${typicalRain}일 정도 비가 자주 와요`;
  return "이맘때는 대체로 맑은 편이에요";
}

function description(status: string, weather: TripWeather | null, destinationLabel: string): string {
  if (status === "loading" || status === "idle") return "날짜별 기온과 비 소식을 모으는 중입니다.";
  if (status === "error" || !weather) return "일정은 안전하게 저장되어 있어요. 잠시 후 다시 열어 주세요.";
  if (!weather.days.length) return "여행 날짜와 장소를 확인해 주세요.";
  const maxes = weather.days.map((day) => day.temperatureMax).filter((value): value is number => value != null);
  const mins = weather.days.map((day) => day.temperatureMin).filter((value): value is number => value != null);
  const range = maxes.length && mins.length ? `${destinationLabel} 최고 ${Math.round(Math.max(...maxes))}° · 최저 ${Math.round(Math.min(...mins))}°` : null;
  const outlook = weather.availableFrom ? `${formatLongDate(weather.availableFrom)}부터 실제 예보로 바뀌어요.` : null;
  return [range, outlook].filter(Boolean).join(" · ") || "날짜별 날씨를 확인해 보세요.";
}

function dayIndex(startDate: string, date: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86_400_000);
}

function formatDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()} (${WEEKDAYS[date.getUTCDay()]})`;
}

function formatLongDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`;
}

function datesBetween(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last && dates.length < 31) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}
