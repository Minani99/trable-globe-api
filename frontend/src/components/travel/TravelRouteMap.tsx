"use client";

import type { PointerEvent, WheelEvent } from "react";
import { useMemo, useRef, useState } from "react";

import { formatDate } from "@/lib/utils/format";
import type { TravelPlace } from "@/types";

interface TravelRouteMapProps {
  places: TravelPlace[];
}

interface PanState {
  pointerId: number;
  x: number;
  y: number;
  centerX: number;
  centerY: number;
}

interface MapTile {
  key: string;
  url: string;
  left: number;
  top: number;
  size: number;
}

const VIEW_WIDTH = 960;
const VIEW_HEIGHT = 620;
const TILE_SIZE = 256;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

/** A raster city map whose route, selected stop and itinerary stay synchronized. */
export function TravelRouteMap({ places }: TravelRouteMapProps) {
  const initialView = useMemo(() => createInitialView(places), [places]);
  const [selectedId, setSelectedId] = useState(places[0]?.id ?? null);
  const [zoom, setZoom] = useState(initialView.zoom);
  const [center, setCenter] = useState({ x: initialView.centerX, y: initialView.centerY });
  const [isDragging, setIsDragging] = useState(false);
  const [loadedTileCount, setLoadedTileCount] = useState(0);
  const panState = useRef<PanState | null>(null);

  const viewport = useMemo(
    () => buildViewport(places, center.x, center.y, zoom),
    [places, center.x, center.y, zoom],
  );
  const selectedIndex = Math.max(0, places.findIndex((place) => place.id === selectedId));
  const selectedPlace = places[selectedIndex] ?? places[0];

  if (!selectedPlace || places.length === 0) {
    return <p className="text-body">지도에 표시할 방문 장소가 없습니다.</p>;
  }

  const updateZoom = (nextZoom: number) => {
    const clamped = clamp(Math.round(nextZoom), MIN_ZOOM, MAX_ZOOM);
    if (clamped === zoom) {
      return;
    }
    const lngLat = worldToLngLat(center.x, center.y, zoom);
    const nextWorld = lngLatToWorld(lngLat.lng, lngLat.lat, clamped);
    setZoom(clamped);
    setCenter({ x: nextWorld.x, y: nextWorld.y });
  };

  const resetViewport = () => {
    setZoom(initialView.zoom);
    setCenter({ x: initialView.centerX, y: initialView.centerY });
  };

  const selectPlace = (place: TravelPlace) => {
    const targetZoom = Math.max(zoom, 15);
    const nextCenter = lngLatToWorld(place.longitude, place.latitude, targetZoom);
    setSelectedId(place.id);
    setZoom(targetZoom);
    setCenter({ x: nextCenter.x, y: nextCenter.y });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY > 0 ? -1 : 1));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    panState.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      centerX: center.x,
      centerY: center.y,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const previous = panState.current;
    if (!previous || previous.pointerId !== event.pointerId) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const pixelScaleX = VIEW_WIDTH / bounds.width;
    const pixelScaleY = VIEW_HEIGHT / bounds.height;
    setCenter({
      x: previous.centerX - (event.clientX - previous.x) * pixelScaleX,
      y: previous.centerY - (event.clientY - previous.y) * pixelScaleY,
    });
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
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
            <p className="eyebrow">Interactive city map</p>
            <p className="travel-route-map-toolbar__hint">드래그해서 이동 · 스크롤로 확대</p>
          </div>
          <div className="travel-route-map-controls" role="toolbar" aria-label="여행 경로 지도 확대·축소">
            <button type="button" onClick={() => updateZoom(zoom + 1)} aria-label="지도 확대">+</button>
            <button type="button" onClick={() => updateZoom(zoom - 1)} aria-label="지도 축소">−</button>
            <button type="button" onClick={resetViewport} aria-label="전체 여행 경로 맞춤">전체</button>
          </div>
        </div>

        <div
          className={`travel-route-map-canvas${isDragging ? " is-dragging" : ""}`}
          role="application"
          aria-label={`${places.map((place) => place.placeName).join(", ")} 방문 순서를 보여주는 실제 도시 지도`}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointer}
          onPointerCancel={finishPointer}
        >
          <div className="travel-route-map-tiles" aria-hidden="true">
            {viewport.tiles.map((tile) => (
              // The OSM policy requires this canonical HTTPS tile URL and browser caching.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                draggable={false}
                width={tile.size}
                height={tile.size}
                style={{ left: tile.left, top: tile.top, width: tile.size, height: tile.size }}
                onLoad={() => setLoadedTileCount((count) => count + 1)}
                onError={() => setLoadedTileCount((count) => count + 1)}
              />
            ))}
          </div>

          <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} aria-label="방문 순서 경로">
            {viewport.points.length > 1 ? (
              <>
                <polyline
                  points={viewport.routeLine}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="8"
                  strokeOpacity="0.82"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points={viewport.routeLine}
                  fill="none"
                  stroke="var(--accent-strong)"
                  strokeWidth="3"
                  strokeDasharray="10 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}

            {viewport.points.map((point, index) => {
              const active = point.place.id === selectedPlace.id;
              return (
                <g
                  key={point.place.id}
                  className={`travel-route-marker${active ? " is-active" : ""}`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${index + 1}번째 장소 ${point.place.placeName}`}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => selectPlace(point.place)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectPlace(point.place);
                    }
                  }}
                >
                  {active ? (
                    <circle cx={point.x} cy={point.y} r="29" fill="var(--accent)" fillOpacity="0.16" />
                  ) : null}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={active ? 18 : 14}
                    fill={active ? "var(--accent-strong)" : "var(--surface)"}
                    stroke="var(--accent-strong)"
                    strokeWidth="2.5"
                  />
                  <text
                    x={point.x}
                    y={point.y + 4}
                    textAnchor="middle"
                    fill={active ? "#ffffff" : "var(--text-primary)"}
                    fontSize="12"
                    fontWeight="650"
                    fontFamily="var(--font-mono)"
                  >
                    {index + 1}
                  </text>
                </g>
              );
            })}
          </svg>

          {loadedTileCount === 0 ? (
            <div className="travel-route-map-loading" role="status">
              <span aria-hidden="true" />
              <p>도시 지도를 불러오는 중</p>
            </div>
          ) : null}

          <div className="travel-route-map-active" aria-live="polite">
            <span>{String(selectedIndex + 1).padStart(2, "0")}</span>
            <div>
              <strong>{selectedPlace.placeName}</strong>
              <p>{[selectedPlace.city?.nameKo, selectedPlace.country.nameKo].filter(Boolean).join(" · ")}</p>
            </div>
          </div>

          <p className="travel-route-map-zoom" aria-live="polite">CITY MAP · Z{zoom}</p>
          <p className="travel-route-map-attribution">
            © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
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
                  onClick={() => selectPlace(place)}
                >
                  <span className="travel-itinerary__number">{String(index + 1).padStart(2, "0")}</span>
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

function createInitialView(places: TravelPlace[]) {
  if (places.length === 0) {
    const fallback = lngLatToWorld(0, 0, 3);
    return { zoom: 3, centerX: fallback.x, centerY: fallback.y };
  }
  const projected = places.map((place) => lngLatToWorld(place.longitude, place.latitude, 0));
  const minX = Math.min(...projected.map((point) => point.x));
  const maxX = Math.max(...projected.map((point) => point.x));
  const minY = Math.min(...projected.map((point) => point.y));
  const maxY = Math.max(...projected.map((point) => point.y));
  const spanX = Math.max(maxX - minX, 1 / 2 ** 16);
  const spanY = Math.max(maxY - minY, 1 / 2 ** 16);
  const fitZoom = Math.floor(
    Math.min(
      Math.log2((VIEW_WIDTH - 180) / spanX / TILE_SIZE),
      Math.log2((VIEW_HEIGHT - 180) / spanY / TILE_SIZE),
    ),
  );
  const zoom = clamp(Number.isFinite(fitZoom) ? fitZoom : 14, 11, 16);
  const centerWorld = lngLatToWorld(
    places.reduce((sum, place) => sum + place.longitude, 0) / places.length,
    places.reduce((sum, place) => sum + place.latitude, 0) / places.length,
    zoom,
  );
  return { zoom, centerX: centerWorld.x, centerY: centerWorld.y };
}

function buildViewport(
  places: TravelPlace[],
  centerX: number,
  centerY: number,
  zoom: number,
) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const originX = centerX - VIEW_WIDTH / 2;
  const originY = centerY - VIEW_HEIGHT / 2;
  const startX = Math.floor(originX / TILE_SIZE) - 1;
  const endX = Math.floor((originX + VIEW_WIDTH) / TILE_SIZE) + 1;
  const startY = Math.max(0, Math.floor(originY / TILE_SIZE) - 1);
  const endY = Math.min(2 ** zoom - 1, Math.floor((originY + VIEW_HEIGHT) / TILE_SIZE) + 1);
  const tiles: MapTile[] = [];

  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      tiles.push({
        key: `${zoom}/${x}/${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
        size: TILE_SIZE,
      });
    }
  }

  const points = places.map((place) => {
    const world = lngLatToWorld(place.longitude, place.latitude, zoom);
    let x = world.x - originX;
    if (x < -worldSize / 2) x += worldSize;
    if (x > VIEW_WIDTH + worldSize / 2) x -= worldSize;
    return { place, x, y: world.y - originY };
  });

  return {
    tiles,
    points,
    routeLine: points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" "),
  };
}

function lngLatToWorld(lng: number, lat: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const safeLat = clamp(lat, -85.05112878, 85.05112878);
  const sin = Math.sin((safeLat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize,
  };
}

function worldToLngLat(x: number, y: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const normalizedY = 0.5 - y / worldSize;
  return {
    lng: (x / worldSize) * 360 - 180,
    lat: (180 / Math.PI) * Math.atan(Math.sinh(2 * Math.PI * normalizedY)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
