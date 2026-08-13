"use client";

import { KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";

interface LocationSearchResult {
  id: string;
  label: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
}

interface PlaceLocationPickerProps {
  countryCode: string;
  countryName: string;
  fallbackLatitude: number;
  fallbackLongitude: number;
  latitude: number | null;
  longitude: number | null;
  onSelect: (location: Omit<LocationSearchResult, "id" | "label">) => void;
}

const TILE_SIZE = 256;
const MAP_HEIGHT = 270;

export function PlaceLocationPicker({
  countryCode,
  countryName,
  fallbackLatitude,
  fallbackLongitude,
  latitude,
  longitude,
  onSelect,
}: PlaceLocationPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [zoom, setZoom] = useState(latitude !== null && longitude !== null ? 15 : 6);
  const [width, setWidth] = useState(720);
  const [center, setCenter] = useState({
    latitude: latitude ?? fallbackLatitude,
    longitude: longitude ?? fallbackLongitude,
  });
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width)));
    });
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(
    () => buildPickerViewport(center.longitude, center.latitude, zoom, width, MAP_HEIGHT),
    [center, zoom, width],
  );
  const marker = latitude === null || longitude === null
    ? null
    : pointInViewport(longitude, latitude, viewport.originX, viewport.originY, zoom);

  async function search() {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setStatus("장소 이름을 두 글자 이상 입력해 주세요.");
      return;
    }
    setSearching(true);
    setStatus(null);
    setResults([]);
    try {
      const params = new URLSearchParams({ q: trimmed, country: countryCode });
      const response = await fetch(`/api/locations/search?${params}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = (await response.json()) as {
        success: boolean;
        data: LocationSearchResult[] | null;
        message: string | null;
      };
      if (!response.ok || !body.success) throw new Error(body.message ?? "장소를 검색하지 못했습니다.");
      setResults(body.data ?? []);
      if (!body.data?.length) setStatus("검색 결과가 없습니다. 더 구체적인 장소명을 입력하거나 지도에서 위치를 선택해 주세요.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "장소를 검색하지 못했습니다.");
    } finally {
      setSearching(false);
    }
  }

  function choose(result: LocationSearchResult) {
    setCenter({ latitude: result.latitude, longitude: result.longitude });
    setZoom(16);
    setResults([]);
    setQuery(result.name);
    setStatus("위치를 선택했습니다. 필요하면 지도에서 핀을 조금 더 정확하게 옮겨 주세요.");
    onSelect(result);
  }

  function chooseOnMap(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLAnchorElement || event.target instanceof HTMLButtonElement) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) * (width / bounds.width);
    const y = (event.clientY - bounds.top) * (MAP_HEIGHT / bounds.height);
    const coordinate = worldToLngLat(viewport.originX + x, viewport.originY + y, zoom);
    onSelect({
      name: query.trim(),
      city: "",
      latitude: coordinate.latitude,
      longitude: coordinate.longitude,
    });
    setStatus("지도에서 위치를 선택했습니다.");
  }

  return (
    <div className="place-picker is-wide">
      <div className="place-picker__intro">
        <div>
          <strong>장소 검색</strong>
          <p>{countryName} 안에서 장소명이나 주소를 검색하세요.</p>
        </div>
        {latitude !== null && longitude !== null ? <span className="place-picker__selected">위치 선택됨</span> : null}
      </div>

      <div className="place-picker__search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 서울숲, 광화문, 제주 성산일출봉"
          maxLength={120}
          aria-label="지도에서 찾을 장소"
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <button type="button" onClick={() => void search()} disabled={searching}>{searching ? "찾는 중…" : "검색"}</button>
      </div>

      {results.length ? (
        <ul className="place-picker__results" aria-label="장소 검색 결과">
          {results.map((result) => (
            <li key={result.id}>
              <button type="button" onClick={() => choose(result)}>
                <strong>{result.name}</strong>
                <span>{result.label}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="place-picker__status" role="status">{status}</p> : null}

      <div
        ref={mapRef}
        className="place-picker__map"
        onPointerDown={chooseOnMap}
        role="application"
        aria-label="클릭해서 방문 위치를 선택하는 지도"
      >
        <div className="place-picker__tiles" aria-hidden="true">
          {viewport.tiles.map((tile) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ left: tile.left, top: tile.top }} />
          ))}
        </div>
        {marker ? <span className="place-picker__marker" style={{ left: marker.x, top: marker.y }} aria-hidden="true" /> : (
          <div className="place-picker__map-hint">검색 결과를 선택하거나<br />지도에서 위치를 눌러 주세요</div>
        )}
        <div className="place-picker__controls">
          <button type="button" aria-label="지도 확대" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoom((value) => Math.min(18, value + 1))}>＋</button>
          <button type="button" aria-label="지도 축소" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoom((value) => Math.max(4, value - 1))}>−</button>
          {latitude !== null && longitude !== null ? (
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => setCenter({ latitude, longitude })}>핀으로 이동</button>
          ) : null}
        </div>
        <p className="place-picker__attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>OpenStreetMap</a></p>
      </div>
      <p className="place-picker__help">검색 결과가 정확하지 않다면 지도를 눌러 핀을 옮기세요. 좌표는 자동으로 저장됩니다.</p>
    </div>
  );
}

function buildPickerViewport(longitude: number, latitude: number, zoom: number, width: number, height: number) {
  const center = lngLatToWorld(longitude, latitude, zoom);
  const originX = center.x - width / 2;
  const originY = center.y - height / 2;
  const startX = Math.floor(originX / TILE_SIZE) - 1;
  const endX = Math.floor((originX + width) / TILE_SIZE) + 1;
  const startY = Math.max(0, Math.floor(originY / TILE_SIZE) - 1);
  const endY = Math.min(2 ** zoom - 1, Math.floor((originY + height) / TILE_SIZE) + 1);
  const tiles = [];
  for (let y = startY; y <= endY; y += 1) {
    for (let x = startX; x <= endX; x += 1) {
      const wrappedX = ((x % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      tiles.push({
        key: `${zoom}/${x}/${y}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
        left: x * TILE_SIZE - originX,
        top: y * TILE_SIZE - originY,
      });
    }
  }
  return { originX, originY, tiles };
}

function pointInViewport(longitude: number, latitude: number, originX: number, originY: number, zoom: number) {
  const point = lngLatToWorld(longitude, latitude, zoom);
  return { x: point.x - originX, y: point.y - originY };
}

function lngLatToWorld(longitude: number, latitude: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const safeLatitude = Math.min(85.05112878, Math.max(-85.05112878, latitude));
  const sin = Math.sin((safeLatitude * Math.PI) / 180);
  return {
    x: ((longitude + 180) / 360) * worldSize,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize,
  };
}

function worldToLngLat(x: number, y: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const normalizedY = 0.5 - y / worldSize;
  return {
    longitude: (x / worldSize) * 360 - 180,
    latitude: (180 / Math.PI) * Math.atan(Math.sinh(2 * Math.PI * normalizedY)),
  };
}
