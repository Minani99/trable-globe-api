"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { CountryOption } from "@/lib/countries";
import type { TravelPlace } from "@/types";
import { coordinate, isPlanningPlaceholder, type PlaceDraft } from "./travel-editor-model";

const RouteMap = dynamic(() => import("@/components/travel/TravelRouteMap").then(module => module.TravelRouteMap), {
  loading: () => <p className="day-map-placeholder" role="status">장소 지도를 불러오는 중…</p>,
});

export function PlanningRoutePreview({ places, countries, focusedKey, onSelect, route }: {
  places: PlaceDraft[]; countries: CountryOption[]; focusedKey: string | null; onSelect: (key: string) => void;
  route?: google.maps.routes.Route | null;
}) {
  const [open, setOpen] = useState(true);
  const mapped = useMemo(() => places.flatMap((place, index) => {
    const latitude = coordinate(place.latitude), longitude = coordinate(place.longitude);
    const country = countries.find(item => item.iso2Code === place.countryCode);
    if (latitude === null || longitude === null || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !country || isPlanningPlaceholder(place)) return [];
    const stop: TravelPlace = {
      id: index + 1, placeName: place.placeName, country, city: null, latitude, longitude,
      visitedAt: place.visitedAt, startTime: place.startTime || null, durationMinutes: Number(place.durationMinutes) || null,
      memo: place.memo || null, completedAt: null, sortOrder: index,
    };
    return [stop];
  }), [places, countries]);
  return <section className="planning-route-preview" aria-label="계획 중인 장소 지도">
    <header><div><small>선택한 날짜 · 장소 {mapped.length}곳</small><strong>{route ? "방문 장소와 이동 경로" : "방문 장소"}</strong></div>{!route ? <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? "지도 접기" : "지도 펼치기"}</button> : null}</header>
    {open || route ? mapped.length ? <RouteMap compact displayedRoute={route} places={mapped} placeNumbers={Object.fromEntries(mapped.map(place => [place.id, place.id]))}
      focusedPlaceId={places.findIndex(place => place.key === focusedKey) + 1 || null}
      onPlaceSelect={id => { const place = places[id - 1]; if (place) onSelect(place.key); }} />
      : <p className="planning-route-preview__empty">장소를 검색해 추가하면 방문 위치가 여기에 표시됩니다.</p> : null}
  </section>;
}
