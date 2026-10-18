"use client";

import { AppIcon } from "@/components/common/AppIcon";
import { useId, useState } from "react";

import {
  buildGoogleDirectionsSegments,
  type GoogleDirectionsStop,
  type GoogleTravelMode,
} from "@/lib/google-directions";

interface GoogleDirectionsPanelProps {
  stops: GoogleDirectionsStop[];
  /** The planner already provides the date selector and filters its stops. */
  activeDate?: string;
}

const TRAVEL_MODES: Array<{ value: GoogleTravelMode; label: string }> = [
  { value: "walking", label: "도보" },
  { value: "transit", label: "대중교통" },
  { value: "driving", label: "자동차" },
];

export function GoogleDirectionsPanel({ stops, activeDate }: GoogleDirectionsPanelProps) {
  const headingId = useId();
  const [mode, setMode] = useState<GoogleTravelMode>("walking");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dates = [...new Set(stops.map((stop) => stop.visitedAt || ""))].sort((a, b) => {
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });
  const shownDate = activeDate ?? (selectedDate !== null && dates.includes(selectedDate) ? selectedDate : dates[0] ?? "");
  const dayStops = stops.filter((stop) => (stop.visitedAt || "") === shownDate);
  const { segments, skipped } = buildGoogleDirectionsSegments(dayStops, mode);

  return (
    <section className="google-directions" aria-labelledby={headingId}>
      <div className="google-directions__heading">
        <div>
          <h3 id={headingId}>실제 이동 경로</h3>
          <p>현재 방문 순서로 Google Maps 추천 경로를 확인하세요.</p>
        </div>
        <div className="google-directions__modes" role="group" aria-label="경로 이동수단">
          {TRAVEL_MODES.map((item) => (
            <button key={item.value} type="button" aria-pressed={mode === item.value} onClick={() => setMode(item.value)}>
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {activeDate === undefined && dates.length > 1 ? (
        <div className="google-directions__days" role="group" aria-label="경로 날짜 선택">
          {dates.map((date) => (
            <button key={date || "undated"} type="button" aria-pressed={shownDate === date} onClick={() => setSelectedDate(date)}>
              {date ? formatRouteDate(date) : "날짜 미정"}
            </button>
          ))}
        </div>
      ) : null}

      {segments.length ? (
        <div className="google-directions__routes">
          {segments.map((segment, index) => (
            <a key={`${segment.stops[0].key}-${segment.stops.at(-1)!.key}`} href={segment.url} target="_blank" rel="noopener noreferrer" className="google-directions__route">
              <span className="google-directions__route-copy">
                <strong>{segments.length === 1 ? "Google Maps에서 경로 보기" : `${index + 1}구간 경로 보기`}</strong>
                <span>{segment.stops[0].placeName} → {segment.stops.at(-1)!.placeName}{segment.stops.length > 2 ? ` · 경유 ${segment.stops.length - 2}곳` : ""}</span>
              </span>
              <AppIcon name="route" />
              <span className="sr-only"> · Google Maps 새 창</span>
            </a>
          ))}
        </div>
      ) : (
        <p className="google-directions__empty">연속된 장소 두 곳의 위치를 정하면 실제 이동 경로를 볼 수 있어요.</p>
      )}

      <div className="google-directions__notes" aria-live="polite">
        {skipped.length ? <p>위치가 미정인 {skipped.length}곳은 제외하고 앞뒤 경로를 나눴어요.</p> : null}
        {mode === "transit" && segments.length > 1 ? <p>대중교통은 장소 사이 구간별로 확인할 수 있어요.</p> : null}
        {mode !== "transit" && segments.length > 1 && segments.some((segment) => segment.stops.length === 5) ? <p>긴 일정은 빠짐없이 확인할 수 있도록 최대 5곳씩 나눴어요.</p> : null}
        {segments.length ? <p>Google Maps 앱 또는 웹에서 소요 시간과 이동 방법을 확인합니다.</p> : null}
      </div>
    </section>
  );
}

function formatRouteDate(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}
