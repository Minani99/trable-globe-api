"use client";

import {
  geocoding,
  type GeocodingFeature,
  Language,
  Map as MapTilerMap,
  MapStyle,
  NavigationControl,
} from "@maptiler/sdk";
// Loaded here rather than in the root layout: this is the only screen that renders a
// map, and from the layout every page paid for the stylesheet.
import "@maptiler/sdk/style.css";
import {
  KeyboardEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import type {
  PlaceRecommendation,
  PlaceRecommendationCategory,
} from "@/lib/place-recommendations";
import { PLACE_RECOMMENDATION_DETAILS } from "@/lib/place-recommendations";

interface LocationSelection {
  name: string;
  city: string;
  label?: string;
  latitude: number;
  longitude: number;
}

interface PlaceLocationPickerProps {
  countryCode: string;
  countryName: string;
  placeName: string;
  cityName: string;
  fallbackLatitude: number;
  fallbackLongitude: number;
  latitude: number | null;
  longitude: number | null;
  routeAnchor?: Coordinate | null;
  travelPreferences?: string[];
  onSelect: (location: LocationSelection) => void;
}

interface SearchSuggestion extends LocationSelection {
  id: string;
  distanceKm?: number;
  categoryLabel?: string;
  recommendationReason?: string;
  openingHours?: string | null;
  cuisine?: string | null;
  stars?: string | null;
  nameLocale?: "ko" | "en" | "local";
  localName?: string | null;
  description?: string;
  features?: string[];
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MapsConfig {
  provider: "maptiler" | "fallback";
  maptilerApiKey: string | null;
}

const TILE_SIZE = 256;
const MAP_HEIGHT = 540;
const PLACEHOLDER_TEXT = "장소를 골라주세요";
const PLACE_IDEA_QUERIES = [
  { label: "할거리", query: "명소", icon: "◎", category: "activity" },
  { label: "맛집", query: "맛집", icon: "♨", category: "food" },
  { label: "카페", query: "카페", icon: "◌", category: "cafe" },
  { label: "숙소", query: "호텔", icon: "⌂", category: "stay" },
] as const;

let mapsConfigPromise: Promise<MapsConfig> | null = null;

export function PlaceLocationPicker({
  countryCode,
  countryName,
  placeName,
  cityName,
  fallbackLatitude,
  fallbackLongitude,
  latitude,
  longitude,
  routeAnchor = null,
  travelPreferences = [],
  onSelect,
}: PlaceLocationPickerProps) {
  const initialName = placeName.includes(PLACEHOLDER_TEXT) ? "" : placeName;
  const [query, setQuery] = useState(initialName);
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [queryTouched, setQueryTouched] = useState(false);
  const [activeIdea, setActiveIdea] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState("all");
  const [resultSource, setResultSource] = useState<"maptiler" | "openstreetmap" | "smart">("openstreetmap");
  const [provider, setProvider] = useState<"checking" | "maptiler" | "fallback">("checking");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapStartCenter, setMapStartCenter] = useState<Coordinate>({
    latitude: latitude ?? fallbackLatitude,
    longitude: longitude ?? fallbackLongitude,
  });
  const [draftCenter, setDraftCenter] = useState<Coordinate>(mapStartCenter);
  const [resolving, setResolving] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(
    [initialName, cityName].filter(Boolean).join(" · "),
  );
  const requestIdRef = useRef(0);
  const hasSelection = latitude !== null && longitude !== null && Boolean(initialName);
  const searchOrigin = routeAnchor ?? { latitude: fallbackLatitude, longitude: fallbackLongitude };
  const recommendationOrigin = routeAnchor ?? (hasSelection && latitude !== null && longitude !== null
    ? { latitude, longitude }
    : null);
  const activeIdeaConfig = PLACE_IDEA_QUERIES.find((idea) => idea.label === activeIdea) ?? null;
  const detailOptions = activeIdeaConfig ? PLACE_RECOMMENDATION_DETAILS[activeIdeaConfig.category] : [];
  const handleMapUnavailable = useCallback(() => {
    setProvider("fallback");
    setApiKey(null);
    setStatus("한국어 지도 연결이 불안정해 기본 지도로 전환했습니다.");
  }, []);

  useEffect(() => {
    let active = true;
    void getMapsConfig().then((config) => {
      if (!active) return;
      if (!config.maptilerApiKey) {
        setProvider("fallback");
        return;
      }
      setApiKey(config.maptilerApiKey);
      setProvider("maptiler");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!mapOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setMapOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mapOpen]);

  const searchPlaces = useCallback(async (searchQuery: string) => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      if (queryTouched) setStatus("장소 이름을 두 글자 이상 입력해 주세요.");
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    setStatus(null);
    const searchWithFallback = async () => {
      const params = new URLSearchParams({
        q: trimmed,
        country: countryCode,
        lat: String(searchOrigin.latitude),
        lng: String(searchOrigin.longitude),
      });
      const response = await fetch(`/api/locations/search?${params}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      const body = (await response.json()) as {
        success: boolean;
        data: SearchSuggestion[] | null;
        message: string | null;
      };
      if (!response.ok || !body.success) throw new Error(body.message ?? "장소를 검색하지 못했습니다.");
      if (requestId !== requestIdRef.current) return;
      setResults(rankByRoute(body.data ?? [], routeAnchor));
      setResultSource("openstreetmap");
      if (!body.data?.length) setStatus("검색 결과가 없습니다. 더 구체적인 장소명을 입력해 주세요.");
    };

    try {
      if (provider === "maptiler" && apiKey) {
        try {
          const response = await geocoding.forward(trimmed, {
            apiKey,
            autocomplete: true,
            country: [countryCode.toLowerCase()],
            language: [Language.KOREAN, Language.ENGLISH],
            limit: 5,
            proximity: [searchOrigin.longitude, searchOrigin.latitude],
          });
          if (requestId !== requestIdRef.current) return;
          const nextResults = rankByRoute(response.features.map(toSearchSuggestion), routeAnchor);
          if (nextResults.length) {
            setResults(nextResults);
            setResultSource("maptiler");
          } else {
            // MapTiler's Korean basemap is consistent, but some overseas POIs are
            // indexed only under their local name. Keep the map provider and use
            // the Korean-first Nominatim route as a search coverage supplement.
            await searchWithFallback();
          }
        } catch {
          if (requestId !== requestIdRef.current) return;
          setProvider("fallback");
          setApiKey(null);
          setStatus("지도 검색 연결이 불안정해 기본 검색으로 전환했습니다.");
          await searchWithFallback();
        }
        return;
      }

      if (provider === "checking") return;
      await searchWithFallback();
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setStatus(error instanceof Error ? error.message : "장소를 검색하지 못했습니다.");
    } finally {
      if (requestId === requestIdRef.current) setSearching(false);
    }
  }, [apiKey, countryCode, provider, queryTouched, routeAnchor, searchOrigin.latitude, searchOrigin.longitude]);

  useEffect(() => {
    if (provider !== "maptiler" || !queryTouched) return;
    const timer = window.setTimeout(() => void searchPlaces(query), 320);
    return () => window.clearTimeout(timer);
  }, [provider, query, queryTouched, searchPlaces]);

  function commitSelection(selection: LocationSelection) {
    onSelect(selection);
    setQuery(selection.name);
    setQueryTouched(false);
    setResults([]);
    setSelectedLabel(selection.label || [selection.name, selection.city].filter(Boolean).join(" · "));
    setStatus("장소를 선택했습니다. 정확한 위치가 필요하면 지도에서 조정할 수 있어요.");
  }

  async function choose(result: SearchSuggestion) {
    setSelecting(true);
    setStatus(null);
    try {
      commitSelection(result);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "장소를 선택하지 못했습니다.");
    } finally {
      setSelecting(false);
    }
  }

  async function searchPlaceIdea(
    idea: (typeof PLACE_IDEA_QUERIES)[number],
    detail = "all",
  ) {
    const area = cityName.trim() || countryName;
    const detailOption = PLACE_RECOMMENDATION_DETAILS[idea.category].find((option) => option.id === detail)
      ?? PLACE_RECOMMENDATION_DETAILS[idea.category][0];
    const nextQuery = `${area} ${detailOption.query || idea.query}`;
    setActiveIdea(idea.label);
    setActiveDetail(detailOption.id);
    setQuery(nextQuery);
    setQueryTouched(false);
    setStatus(null);
    if (!recommendationOrigin) {
      await searchPlaces(nextQuery);
      return;
    }

    const requestId = ++requestIdRef.current;
    setSearching(true);
    try {
      const params = new URLSearchParams({
        category: idea.category satisfies PlaceRecommendationCategory,
        detail: detailOption.id,
        lat: String(recommendationOrigin.latitude),
        lng: String(recommendationOrigin.longitude),
      });
      if (travelPreferences.length) params.set("preferences", travelPreferences.join(","));
      const response = await fetch(`/api/places/recommend?${params}`, { cache: "no-store" });
      const body = await response.json() as {
        success: boolean;
        data: PlaceRecommendation[] | null;
        message: string | null;
      };
      if (requestId !== requestIdRef.current) return;
      if (!response.ok || !body.success || !body.data?.length) {
        await searchPlaces(nextQuery);
        return;
      }
      setResults(body.data);
      setResultSource("smart");
      setStatus(`${idea.label} · ${detailOption.label} 후보를 실제 주변 장소와 현재 동선으로 정리했습니다.`);
    } catch {
      if (requestId !== requestIdRef.current) return;
      await searchPlaces(nextQuery);
    } finally {
      if (requestId === requestIdRef.current) setSearching(false);
    }
  }

  function openMap() {
    const center = {
      latitude: latitude ?? fallbackLatitude,
      longitude: longitude ?? fallbackLongitude,
    };
    setMapStartCenter(center);
    setDraftCenter(center);
    setMapOpen(true);
    setStatus(null);
  }

  async function confirmMapLocation() {
    setResolving(true);
    try {
      const fallbackName = query.trim() || initialName || "선택한 위치";
      let selection: LocationSelection;
      if (provider === "maptiler" && apiKey) {
        const response = await geocoding.reverse([draftCenter.longitude, draftCenter.latitude], {
          apiKey,
          language: [Language.KOREAN, Language.ENGLISH],
          limit: 1,
        });
        const first = response.features[0];
        selection = {
          name: fallbackName === "선택한 위치" ? (first?.text || fallbackName) : fallbackName,
          city: first ? cityFromFeature(first) : cityName,
          label: first?.place_name || `${draftCenter.latitude.toFixed(5)}, ${draftCenter.longitude.toFixed(5)}`,
          ...draftCenter,
        };
      } else {
        const params = new URLSearchParams({ lat: String(draftCenter.latitude), lng: String(draftCenter.longitude) });
        const response = await fetch(`/api/locations/reverse?${params}`, { cache: "no-store" });
        const body = (await response.json()) as {
          success: boolean;
          data: LocationSelection | null;
          message: string | null;
        };
        selection = body.success && body.data
          ? { ...body.data, name: fallbackName === "선택한 위치" ? body.data.name : fallbackName }
          : { name: fallbackName, city: cityName, label: body.message ?? undefined, ...draftCenter };
      }
      commitSelection(selection);
      setMapOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "선택한 위치를 확인하지 못했습니다.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div className="place-picker is-wide">
      <div className="place-picker__intro">
        <div><strong>어디로 갈까요?</strong><p>{countryName} 안의 장소명·역·호텔·주소를 한국어로 검색하세요.</p></div>
        {hasSelection ? <span className="place-picker__selected">선택 완료</span> : null}
      </div>

      <div className="place-picker__ideas" aria-label="여행 장소 종류별 추천 검색">
        <span><b aria-hidden="true">✦</b> {cityName.trim() || countryName}에서 뭐 할까요?</span>
        <div>{PLACE_IDEA_QUERIES.map((idea) => <button key={idea.label} type="button" className={activeIdea === idea.label ? "is-active" : undefined} aria-pressed={activeIdea === idea.label} onClick={() => searchPlaceIdea(idea)} disabled={searching || provider === "checking"}><span aria-hidden="true">{idea.icon}</span>{idea.label}</button>)}</div>
      </div>

      {activeIdeaConfig ? (
        <div className="place-picker__details" aria-label={`${activeIdeaConfig.label} 세부 추천 조건`}>
          <span>어떤 곳을 찾을까요?</span>
          <div>
            {detailOptions.map((detail) => (
              <button
                key={detail.id}
                type="button"
                className={activeDetail === detail.id ? "is-active" : undefined}
                aria-pressed={activeDetail === detail.id}
                onClick={() => void searchPlaceIdea(activeIdeaConfig, detail.id)}
                disabled={searching}
              >
                {detail.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="place-picker__search">
        <span className="place-picker__search-icon" aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIdea(null);
            setQueryTouched(true);
            if (event.target.value.trim().length < 2) setResults([]);
          }}
          placeholder="예: 에펠탑, 도쿄역, 바르셀로나 호텔"
          maxLength={120}
          aria-label="방문할 장소 검색"
          autoComplete="off"
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchPlaces(query);
            }
          }}
        />
        <button type="button" onClick={() => void searchPlaces(query)} disabled={searching || provider === "checking"}>{searching ? "찾는 중…" : "검색"}</button>
      </div>

      {results.length ? (
        <div className="place-picker__result-shell">
          <header className="place-picker__result-heading"><span><b aria-hidden="true">✦</b><strong>{activeIdea ? `${activeIdea} ${resultSource === "smart" ? "맞춤 후보" : "실제 장소 후보"}` : "실제 장소 검색 결과"}</strong></span><small>{resultSource === "smart" ? "취향·동선 추천순" : routeAnchor ? "이전 일정과 가까운 순" : "검색 관련도순"}</small></header>
          <ul className="place-picker__results" aria-label="장소 검색 결과">
            {results.map((result) => (
              <li key={result.id}>
                <article className="place-picker__result-card">
                  <button type="button" className="place-picker__result-pick" onClick={() => void choose(result)} disabled={selecting}>
                    <span className="place-picker__result-pin" aria-hidden="true">●</span>
                    <span className="place-picker__result-copy">
                      <span className="place-picker__result-title">
                        <strong>{result.name}</strong>
                        {result.nameLocale === "local" ? <b>현지 표기</b> : result.nameLocale === "en" ? <b>영문명</b> : null}
                      </span>
                      {result.localName ? <small className="place-picker__result-local">현지명 · {result.localName}</small> : null}
                      {result.description ? <p>{result.description}</p> : null}
                      <small>{result.label || result.categoryLabel}</small>
                      {result.recommendationReason
                        ? <em>{result.recommendationReason}</em>
                        : result.distanceKm !== undefined ? <em>{formatDistance(result.distanceKm)} · 이전 일정에서 이동</em> : null}
                      {result.openingHours || result.cuisine || result.stars || result.features?.length ? <span className="place-picker__result-meta">
                        {result.openingHours ? <i>영업시간 {result.openingHours}</i> : null}
                        {result.cuisine ? <i>음식 종류 {readableCuisine(result.cuisine)}</i> : null}
                        {result.stars ? <i>{result.stars}성급</i> : null}
                        {result.features?.map((feature) => <i key={feature}>{feature}</i>)}
                      </span> : null}
                    </span>
                    <span className="place-picker__result-action">일정에 담기</span>
                  </button>
                  <div className="place-picker__result-links">
                    <a href={googleMapsSearchUrl(result)} target="_blank" rel="noreferrer">Google 지도에서 사진·후기 보기 <span aria-hidden="true">↗</span></a>
                  </div>
                </article>
              </li>
            ))}
          </ul>
          <p className="place-picker__provider-attribution" translate="no">
            {resultSource === "maptiler" ? "MapTiler · " : "Data © "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>
          </p>
        </div>
      ) : null}

      {hasSelection ? (
        <div className="place-picker__selected-card">
          <span className="place-picker__selected-card-icon" aria-hidden="true">✓</span>
          <span><strong>{initialName || query || "위치 선택됨"}</strong><small>{selectedLabel || cityName || `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}`}</small></span>
          <button type="button" onClick={openMap}>위치 조정</button>
        </div>
      ) : (
        <button type="button" className="place-picker__map-open" onClick={openMap}>
          <span aria-hidden="true">⌖</span><span><strong>지도에서 직접 찾기</strong><small>지도를 움직여 중앙 핀에 맞추세요</small></span><b aria-hidden="true">›</b>
        </button>
      )}

      {status ? <p className="place-picker__status" role="status">{status}</p> : null}
      <p className="place-picker__help">{provider === "maptiler" ? "MapTiler의 한국어 지도·장소 검색을 사용합니다." : provider === "checking" ? "장소 검색을 준비하고 있습니다…" : "한국어 우선 기본 검색을 사용 중입니다."}</p>

      {mapOpen && typeof document !== "undefined" ? createPortal(
        <div className="place-map-dialog" role="dialog" aria-modal="true" aria-label="지도에서 위치 조정">
          <div className="place-map-dialog__sheet">
            <header>
              <button type="button" className="place-map-dialog__close" onClick={() => setMapOpen(false)} aria-label="지도 닫기">×</button>
              <div><strong>위치 조정</strong><span>{countryName} · 지도를 움직여 핀에 맞추세요</span></div>
              <span className="place-map-dialog__provider" translate="no">{provider === "maptiler" ? "MapTiler" : "OpenStreetMap"}</span>
            </header>
            <div className="place-map-dialog__canvas">
              {provider === "maptiler" && apiKey ? (
                <MapTilerMapCanvas
                  apiKey={apiKey}
                  initialCenter={mapStartCenter}
                  onCenterChange={setDraftCenter}
                  onUnavailable={handleMapUnavailable}
                />
              ) : <FallbackMapCanvas initialCenter={mapStartCenter} onCenterChange={setDraftCenter} />}
              <span className="place-map-dialog__pin" aria-hidden="true"><i /></span>
              <p className="place-map-dialog__move-hint">지도를 움직여 위치를 맞추세요</p>
            </div>
            <footer>
              <div><span>선택할 위치</span><strong>{query.trim() || initialName || `${draftCenter.latitude.toFixed(5)}, ${draftCenter.longitude.toFixed(5)}`}</strong><small>{draftCenter.latitude.toFixed(6)}, {draftCenter.longitude.toFixed(6)}</small></div>
              <button type="button" onClick={() => void confirmMapLocation()} disabled={resolving}>{resolving ? "주소 확인 중…" : "이 위치로 확정"}</button>
            </footer>
          </div>
        </div>, document.body,
      ) : null}
    </div>
  );
}

function MapTilerMapCanvas({
  apiKey,
  initialCenter,
  onCenterChange,
  onUnavailable,
}: {
  apiKey: string;
  initialCenter: Coordinate;
  onCenterChange: (coordinate: Coordinate) => void;
  onUnavailable: () => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mapElementRef.current) return;
    const map = new MapTilerMap({
      container: mapElementRef.current,
      apiKey,
      style: MapStyle.STREETS,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: 16,
      language: Language.KOREAN,
      navigationControl: false,
      geolocateControl: false,
      terrainControl: false,
      fullscreenControl: false,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    let loaded = false;
    let reportedUnavailable = false;
    const reportUnavailable = () => {
      if (loaded || reportedUnavailable) return;
      reportedUnavailable = true;
      onUnavailable();
    };
    const loadTimeout = window.setTimeout(reportUnavailable, 12_000);
    map.on("load", () => {
      loaded = true;
      window.clearTimeout(loadTimeout);
    });
    map.on("error", reportUnavailable);
    const updateCenter = () => {
      const center = map.getCenter();
      onCenterChange({ latitude: center.lat, longitude: center.lng });
    };
    map.on("moveend", updateCenter);
    return () => {
      window.clearTimeout(loadTimeout);
      map.remove();
    };
  }, [apiKey, initialCenter.latitude, initialCenter.longitude, onCenterChange, onUnavailable]);

  return <div ref={mapElementRef} className="place-map-dialog__provider-map" aria-label="한국어 MapTiler 지도" />;
}

function FallbackMapCanvas({ initialCenter, onCenterChange }: { initialCenter: Coordinate; onCenterChange: (coordinate: Coordinate) => void }) {
  const [center, setCenter] = useState(initialCenter);
  const [zoom, setZoom] = useState(15);
  const [width, setWidth] = useState(900);
  const [dragging, setDragging] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; centerWorld: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setWidth(Math.max(280, Math.round(entry.contentRect.width))); });
    observer.observe(map);
    return () => observer.disconnect();
  }, []);

  const viewport = useMemo(() => buildPickerViewport(center.longitude, center.latitude, zoom, width, MAP_HEIGHT), [center, zoom, width]);

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLButtonElement || event.target instanceof HTMLAnchorElement) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, centerWorld: lngLatToWorld(center.longitude, center.latitude, zoom) };
    setDragging(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const coordinate = worldToLngLat(
      drag.centerWorld.x - (event.clientX - drag.startX) * (width / bounds.width),
      drag.centerWorld.y - (event.clientY - drag.startY) * (MAP_HEIGHT / bounds.height),
      zoom,
    );
    setCenter(coordinate);
    onCenterChange(coordinate);
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div ref={mapRef} className={`place-map-dialog__fallback-map${dragging ? " is-dragging" : ""}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label="위치를 조정하는 기본 지도">
      <div className="place-map-dialog__tiles" aria-hidden="true">
        {viewport.tiles.map((tile) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={tile.key} src={tile.url} alt="" draggable={false} style={{ left: tile.left, top: tile.top }} />
        ))}
      </div>
      <div className="place-map-dialog__controls">
        <button type="button" aria-label="지도 확대" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoom((value) => Math.min(18, value + 1))}>＋</button>
        <button type="button" aria-label="지도 축소" onPointerDown={(event) => event.stopPropagation()} onClick={() => setZoom((value) => Math.max(4, value - 1))}>−</button>
      </div>
      <p className="place-map-dialog__attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" onPointerDown={(event) => event.stopPropagation()}>OpenStreetMap</a></p>
    </div>
  );
}

function getMapsConfig() {
  mapsConfigPromise ??= fetch("/api/maps/config", { cache: "no-store" }).then(async (response) => {
    if (!response.ok) throw new Error("Map config unavailable");
    const body = (await response.json()) as { success: boolean; data: MapsConfig | null };
    if (!body.success || !body.data) throw new Error("Map config unavailable");
    return body.data;
  }).catch(() => ({ provider: "fallback" as const, maptilerApiKey: null }));
  return mapsConfigPromise;
}

function rankByRoute(results: SearchSuggestion[], anchor: Coordinate | null): SearchSuggestion[] {
  if (!anchor) return results;
  return results
    .map((result) => ({
      ...result,
      distanceKm: haversineDistance(anchor, result),
    }))
    .sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
}

function haversineDistance(from: Coordinate, to: Coordinate): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const startLatitude = radians(from.latitude);
  const endLatitude = radians(to.latitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.max(10, Math.round(distanceKm * 1000 / 10) * 10)}m`;
  return `${distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)}km`;
}

function googleMapsSearchUrl(result: SearchSuggestion): string {
  const query = [result.name, result.localName, result.label, `${result.latitude},${result.longitude}`]
    .filter(Boolean)
    .join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function readableCuisine(value: string): string {
  const labels: Record<string, string> = {
    korean: "한식", japanese: "일식", sushi: "스시", ramen: "라멘", chinese: "중식",
    italian: "이탈리아식", french: "프랑스식", indian: "인도식", thai: "태국식", vietnamese: "베트남식",
    mexican: "멕시코식", vegetarian: "채식", vegan: "비건", seafood: "해산물", pizza: "피자",
    burger: "버거", coffee_shop: "커피", dessert: "디저트", cake: "케이크", bakery: "베이커리",
  };
  return value.split(" · ").map((item) => labels[item.trim().toLowerCase()] ?? item.trim()).join(" · ");
}

function toSearchSuggestion(feature: GeocodingFeature): SearchSuggestion {
  return {
    id: feature.id,
    name: feature.text,
    city: cityFromFeature(feature),
    label: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
  };
}

function cityFromFeature(feature: GeocodingFeature) {
  const cityPattern = /^(municipality|locality|place|county)\./;
  return feature.context?.find((item) => cityPattern.test(item.id))?.text
    || (feature.place_type.some((type) => ["municipality", "locality", "place"].includes(type)) ? feature.text : "")
    || feature.place_name.split(",")[1]?.trim()
    || "";
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
      tiles.push({ key: `${zoom}/${x}/${y}`, url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`, left: x * TILE_SIZE - originX, top: y * TILE_SIZE - originY });
    }
  }
  return { tiles };
}

function lngLatToWorld(longitude: number, latitude: number, zoom: number) {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const safeLatitude = Math.min(85.05112878, Math.max(-85.05112878, latitude));
  const sin = Math.sin((safeLatitude * Math.PI) / 180);
  return { x: ((longitude + 180) / 360) * worldSize, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * worldSize };
}

function worldToLngLat(x: number, y: number, zoom: number): Coordinate {
  const worldSize = TILE_SIZE * 2 ** zoom;
  const normalizedY = 0.5 - y / worldSize;
  return { longitude: (x / worldSize) * 360 - 180, latitude: (180 / Math.PI) * Math.atan(Math.sinh(2 * Math.PI * normalizedY)) };
}
