"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";

import { formatDate } from "@/lib/utils/format";
import type { TravelPlace } from "@/types";

interface TravelRouteMapProps {
  places: TravelPlace[];
  countryCodes: string[];
}

interface CountryFeature {
  properties: { iso2: string | null };
  geometry:
    | { type: "Polygon"; coordinates: number[][][] }
    | { type: "MultiPolygon"; coordinates: number[][][][] };
}

interface PanState {
  pointerId: number;
  x: number;
  y: number;
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 620;
const MAP_PADDING = 94;
const MIN_LONGITUDE_SPAN = 0.12;
const MIN_LATITUDE_SPAN = 0.08;
const MAX_ZOOM = 5;

/**
 * A route explorer rather than a static diagram.
 *
 * The map owns the selected stop and viewport so the numbered route and itinerary stay
 * in sync. Names live in the itinerary instead of being drawn over each other on the map.
 */
export function TravelRouteMap({ places, countryCodes }: TravelRouteMapProps) {
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panState = useRef<PanState | null>(null);
  const countryKey = countryCodes.join(",");

  useEffect(() => {
    if (places.length === 0) {
      return;
    }
    const wanted = new Set(countryKey.split(",").filter(Boolean));
    let cancelled = false;

    fetch("/geo/countries.geo.json")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((collection: { features: CountryFeature[] }) => {
        if (!cancelled) {
          setFeatures(
            collection.features.filter(
              (entry) => entry.properties.iso2 !== null && wanted.has(entry.properties.iso2),
            ),
          );
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [places.length, countryKey]);

  const projection = useMemo(() => createProjection(places), [places]);
  const countryPaths = useMemo(() => {
    if (!projection) {
      return [];
    }
    return features.flatMap((entry) => toPathStrings(entry.geometry, projection));
  }, [features, projection]);

  if (!projection || places.length === 0) {
    return <p className="text-body">지도에 표시할 방문 장소가 없습니다.</p>;
  }

  const points = spreadClosePoints(
    places.map((place) => ({
      place,
      ...projection(place.longitude, place.latitude),
    })),
  );
  const routeLine = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const selectedIndex = Math.max(0, places.findIndex((place) => place.id === selectedId));
  const selectedPlace = places[selectedIndex] ?? places[0];
  const mapTransform = `translate(${offset.x} ${offset.y}) translate(${VIEW_WIDTH / 2} ${VIEW_HEIGHT / 2}) scale(${zoom}) translate(${-VIEW_WIDTH / 2} ${-VIEW_HEIGHT / 2})`;

  const updateZoom = (nextZoom: number) => {
    const clamped = clamp(nextZoom, 1, MAX_ZOOM);
    setZoom(clamped);
    if (clamped === 1) {
      setOffset({ x: 0, y: 0 });
    }
  };

  const resetViewport = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    updateZoom(event.deltaY > 0 ? zoom / 1.18 : zoom * 1.18);
  };

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    panState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const previous = panState.current;
    if (!previous || previous.pointerId !== event.pointerId || zoom === 1) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const unitScale = VIEW_WIDTH / bounds.width;
    const dx = (event.clientX - previous.x) * unitScale;
    const dy = (event.clientY - previous.y) * unitScale;
    const limitX = VIEW_WIDTH * 0.42;
    const limitY = VIEW_HEIGHT * 0.42;

    setOffset((current) => ({
      x: clamp(current.x + dx, -limitX, limitX),
      y: clamp(current.y + dy, -limitY, limitY),
    }));
    panState.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const finishPointer = (event: PointerEvent<SVGSVGElement>) => {
    if (panState.current?.pointerId === event.pointerId) {
      panState.current = null;
      setIsDragging(false);
    }
  };

  return (
    <div className="travel-route-explorer">
      <div className="travel-route-map-shell">
        <div className="travel-route-map-toolbar">
          <div>
            <p className="eyebrow">Interactive route</p>
            <p className="travel-route-map-toolbar__hint">드래그해서 이동 · 휠로 확대</p>
          </div>
          <div className="travel-route-map-controls" role="toolbar" aria-label="여행 경로 지도 확대·축소">
            <button type="button" onClick={() => updateZoom(zoom * 1.35)} aria-label="지도 확대">
              +
            </button>
            <button type="button" onClick={() => updateZoom(zoom / 1.35)} aria-label="지도 축소">
              −
            </button>
            <button type="button" onClick={resetViewport} aria-label="지도 처음 위치로">
              맞춤
            </button>
          </div>
        </div>

        <div className="travel-route-map-canvas">
          <svg
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className={isDragging ? "is-dragging" : ""}
            role="img"
            aria-label={`${places.map((place) => place.placeName).join(", ")} 방문 순서를 보여주는 확대 가능한 여행 경로 지도`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
          >
            <defs>
              <pattern id="route-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--map-grid)" strokeWidth="1" />
              </pattern>
              <filter id="route-glow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="var(--map-ocean)" />
            <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#route-grid)" />

            <g transform={mapTransform}>
              {countryPaths.map((path, index) => (
                <path
                  key={index}
                  d={path}
                  fill="var(--map-land)"
                  fillOpacity="0.58"
                  stroke="var(--map-land-stroke)"
                  strokeWidth={1.1 / zoom}
                  strokeLinejoin="round"
                />
              ))}

              {points.length > 1 ? (
                <>
                  <polyline
                    points={routeLine}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={8 / zoom}
                    strokeOpacity={0.12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    points={routeLine}
                    fill="none"
                    stroke="var(--accent-strong)"
                    strokeWidth={2.4 / zoom}
                    strokeDasharray={`${10 / zoom} ${8 / zoom}`}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              ) : null}

              {points.map((point, index) => {
                const active = point.place.id === selectedPlace.id;
                const markerRadius = (active ? 19 : 15) / zoom;
                return (
                  <g
                    key={point.place.id}
                    className={`travel-route-marker${active ? " is-active" : ""}`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${index + 1}번째 장소 ${point.place.placeName}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedId(point.place.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedId(point.place.id);
                      }
                    }}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={28 / zoom}
                      fill="transparent"
                      pointerEvents="all"
                    />
                    {active ? (
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={32 / zoom}
                        fill="var(--accent)"
                        fillOpacity={0.13}
                        filter="url(#route-glow)"
                      />
                    ) : null}
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={markerRadius}
                      fill={active ? "var(--accent-strong)" : "var(--map-marker)"}
                      stroke="var(--map-marker-border)"
                      strokeWidth={2 / zoom}
                    />
                    <text
                      x={point.x}
                      y={point.y + 4.5 / zoom}
                      textAnchor="middle"
                      fill={active ? "#ffffff" : "var(--text-primary)"}
                      fontSize={13 / zoom}
                      fontWeight="650"
                      fontFamily="var(--font-mono)"
                      pointerEvents="none"
                    >
                      {index + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          <div className="travel-route-map-active" aria-live="polite">
            <span>{String(selectedIndex + 1).padStart(2, "0")}</span>
            <div>
              <strong>{selectedPlace.placeName}</strong>
              <p>
                {[selectedPlace.city?.nameKo, selectedPlace.country.nameKo]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>

          <p className="travel-route-map-zoom" aria-live="polite">
            {Math.round(zoom * 100)}%
          </p>
        </div>
      </div>

      <aside className="travel-itinerary" aria-label="방문 장소 일정">
        <div className="travel-itinerary__header">
          <div>
            <p className="eyebrow">Itinerary</p>
            <h3>방문 순서</h3>
          </div>
          <span>{String(places.length).padStart(2, "0")} STOPS</span>
        </div>

        <ol className="travel-itinerary__list">
          {places.map((place, index) => {
            const active = place.id === selectedPlace.id;
            return (
              <li key={place.id}>
                <button
                  type="button"
                  className={active ? "is-active" : ""}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setSelectedId(place.id)}
                >
                  <span className="travel-itinerary__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="travel-itinerary__content">
                    <span className="travel-itinerary__meta">
                      {place.visitedAt ? formatDate(place.visitedAt) : `STOP ${index + 1}`}
                    </span>
                    <strong>{place.placeName}</strong>
                    <span className="travel-itinerary__location">
                      {[place.city?.nameKo, place.country.nameKo].filter(Boolean).join(" · ")}
                    </span>
                    {place.memo ? <span className="travel-itinerary__memo">{place.memo}</span> : null}
                  </span>
                  <span className="travel-itinerary__arrow" aria-hidden="true">↗</span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
    </div>
  );
}

type Projection = (lng: number, lat: number) => { x: number; y: number };

interface ProjectedPlace {
  place: TravelPlace;
  x: number;
  y: number;
}

/**
 * Nearby city stops can be only a few streets apart. A small screen-space relaxation
 * keeps their numbered markers selectable without pretending the geography is farther
 * apart than it is; the route shape and ordering are still preserved.
 */
function spreadClosePoints(source: ProjectedPlace[]): ProjectedPlace[] {
  const points = source.map((point) => ({ ...point }));
  const minimumDistance = 58;

  for (let pass = 0; pass < 6; pass += 1) {
    for (let first = 0; first < points.length; first += 1) {
      for (let second = first + 1; second < points.length; second += 1) {
        const dx = points[second].x - points[first].x;
        const dy = points[second].y - points[first].y;
        const distance = Math.hypot(dx, dy);
        if (distance >= minimumDistance) {
          continue;
        }

        const angle = distance > 0.1 ? Math.atan2(dy, dx) : (second * Math.PI * 2) / points.length;
        const adjustment = (minimumDistance - distance) / 2;
        const pushX = Math.cos(angle) * adjustment;
        const pushY = Math.sin(angle) * adjustment;

        points[first].x = clamp(points[first].x - pushX, 48, VIEW_WIDTH - 48);
        points[first].y = clamp(points[first].y - pushY, 48, VIEW_HEIGHT - 48);
        points[second].x = clamp(points[second].x + pushX, 48, VIEW_WIDTH - 48);
        points[second].y = clamp(points[second].y + pushY, 48, VIEW_HEIGHT - 48);
      }
    }
  }

  return points;
}

/** Fits a city-scale route tightly enough that nearby stops remain individually useful. */
function createProjection(places: TravelPlace[]): Projection | null {
  if (places.length === 0) {
    return null;
  }

  const lngs = unwrapToSmallestArc(places.map((place) => place.longitude));
  const lats = places.map((place) => place.latitude);
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const rawSpanLng = Math.max(...lngs) - Math.min(...lngs);
  const rawSpanLat = Math.max(...lats) - Math.min(...lats);
  const spanLng = Math.max(rawSpanLng * 1.9, MIN_LONGITUDE_SPAN);
  const spanLat = Math.max(rawSpanLat * 1.9, MIN_LATITUDE_SPAN);
  const scale = Math.min(
    (VIEW_WIDTH - MAP_PADDING * 2) / spanLng,
    (VIEW_HEIGHT - MAP_PADDING * 2) / spanLat,
  );

  return (lng, lat) => ({
    x: VIEW_WIDTH / 2 + (nearestEquivalentLongitude(lng, centerLng) - centerLng) * scale,
    y: VIEW_HEIGHT / 2 - (lat - centerLat) * scale,
  });
}

function unwrapToSmallestArc(longitudes: number[]): number[] {
  if (longitudes.length <= 1) {
    return longitudes.map(normalizeLongitude);
  }

  const sorted = longitudes.map(normalizeLongitude).sort((a, b) => a - b);
  let largestGap = -1;
  let arcStart = sorted[0];

  for (let index = 0; index < sorted.length; index += 1) {
    const current = sorted[index];
    const next = index === sorted.length - 1 ? sorted[0] + 360 : sorted[index + 1];
    const gap = next - current;
    if (gap > largestGap) {
      largestGap = gap;
      arcStart = normalizeLongitude(next);
    }
  }

  return longitudes.map((longitude) => {
    const normalized = normalizeLongitude(longitude);
    return normalized < arcStart ? normalized + 360 : normalized;
  });
}

function normalizeLongitude(longitude: number): number {
  return ((longitude % 360) + 360) % 360;
}

function nearestEquivalentLongitude(longitude: number, center: number): number {
  const normalized = normalizeLongitude(longitude);
  return normalized + 360 * Math.round((center - normalized) / 360);
}

function toPathStrings(geometry: CountryFeature["geometry"], project: Projection): string[] {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons.map((rings) =>
    rings
      .map((ring) => {
        const commands = ring.map(([lng, lat], index) => {
          const { x, y } = project(lng, lat);
          return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        });
        return `${commands.join(" ")} Z`;
      })
      .join(" "),
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
