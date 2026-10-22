"use client";

import { useEffect, useRef, useState } from "react";

import { googleMapsApiKey, loadGoogleMaps, onGoogleMapsAuthFailure } from "@/lib/google-maps-loader";
import type { TravelPlace } from "@/types";

interface GoogleRouteMapCanvasProps {
  places: TravelPlace[];
  numberOf: (place: TravelPlace, index: number) => number;
  selectedId: number;
  /** Changes whenever a place should be brought into view, even the same one again. */
  focusRequest: { id: number; sequence: number } | null;
  /** Changes whenever every place should be fitted into view. */
  fitRequest: number;
  /** Small embedded maps let one finger scroll the page and two fingers move the map. */
  cooperative: boolean;
  label: string;
  onSelect: (place: TravelPlace) => void;
  onUnavailable: () => void;
}

const LOAD_TIMEOUT_MS = 15_000;
const FOCUS_ZOOM = 15;
const FALLBACK_ACCENT = "#c24d1e";

/** Itinerary stops as numbered markers on an interactive Google map. */
export function GoogleRouteMapCanvas({
  places,
  numberOf,
  selectedId,
  focusRequest,
  fitRequest,
  cooperative,
  label,
  onSelect,
  onUnavailable,
}: GoogleRouteMapCanvasProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef(new Map<number, { marker: google.maps.Marker; number: number }>());
  const [ready, setReady] = useState(false);
  // Callbacks and the numbering are read from refs so a parent re-render never rebuilds the map.
  const latest = useRef({ onSelect, onUnavailable, numberOf });
  useEffect(() => {
    latest.current = { onSelect, onUnavailable, numberOf };
  });
  const signature = JSON.stringify(places.map((place, index) => [
    place.id, place.latitude, place.longitude, place.placeName, numberOf(place, index),
  ]));

  useEffect(() => {
    if (!googleMapsApiKey || !elementRef.current) return;
    const element = elementRef.current;
    const stops: TravelPlace[] = places;
    let cancelled = false;
    const listeners: google.maps.MapsEventListener[] = [];
    const markers = markersRef.current;
    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      latest.current.onUnavailable();
    };
    const timer = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    const stopListening = onGoogleMapsAuthFailure(fail);

    async function show() {
      await loadGoogleMaps(googleMapsApiKey!);
      const [{ Map }, { Marker }] = await Promise.all([
        google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
        google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
      ]);
      if (cancelled) return;
      const map = mapRef.current ?? new Map(element, {
        center: { lat: stops[0].latitude, lng: stops[0].longitude },
        zoom: FOCUS_ZOOM,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: !cooperative,
        gestureHandling: cooperative ? "cooperative" : "auto",
      });
      mapRef.current = map;
      stops.forEach((place, index) => {
        const number = latest.current.numberOf(place, index);
        const marker = new Marker({
          map,
          position: { lat: place.latitude, lng: place.longitude },
          title: `${number}번째 장소 ${place.placeName}`,
          ...markerAppearance(number, false),
        });
        listeners.push(marker.addListener("click", () => latest.current.onSelect(place)));
        markers.set(place.id, { marker, number });
      });
      fitPlaces(map, stops);
      window.clearTimeout(timer);
      setReady(true);
    }

    show().catch(fail);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopListening();
      listeners.forEach((listener) => listener.remove());
      markers.forEach(({ marker }) => marker.setMap(null));
      markers.clear();
      setReady(false);
    };
    // `places` is captured through `signature`; the map only rebuilds when the stops change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, cooperative]);

  useEffect(() => {
    if (!ready) return;
    markersRef.current.forEach(({ marker, number }, id) => {
      const active = id === selectedId;
      const appearance = markerAppearance(number, active);
      marker.setIcon(appearance.icon);
      marker.setLabel(appearance.label);
      marker.setZIndex(appearance.zIndex);
    });
  }, [ready, selectedId]);

  useEffect(() => {
    if (!ready || !focusRequest) return;
    const map = mapRef.current;
    const position = markersRef.current.get(focusRequest.id)?.marker.getPosition();
    if (!map || !position) return;
    map.panTo(position);
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
  }, [ready, focusRequest]);

  useEffect(() => {
    if (!ready || fitRequest === 0 || !mapRef.current) return;
    fitPlaces(mapRef.current, places);
    // Fitting is an explicit request; a changed place list already refits while rebuilding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitRequest]);

  return (
    <>
      {/* Google owns every child of this element, so React renders nothing inside it. */}
      <div ref={elementRef} className="travel-route-map-google" role="region" aria-label={label} />
      {!ready ? <p className="travel-route-map-google__loading" role="status">Google 지도를 불러오는 중…</p> : null}
    </>
  );
}

function fitPlaces(map: google.maps.Map, places: TravelPlace[]) {
  if (places.length === 1) {
    map.setCenter({ lat: places[0].latitude, lng: places[0].longitude });
    map.setZoom(FOCUS_ZOOM);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  places.forEach((place) => bounds.extend({ lat: place.latitude, lng: place.longitude }));
  map.fitBounds(bounds, 48);
}

function markerAppearance(number: number, active: boolean) {
  const accent = accentColor();
  return {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: active ? 15 : 12,
      fillColor: active ? accent : "#ffffff",
      fillOpacity: 1,
      strokeColor: accent,
      strokeWeight: 2.5,
    } satisfies google.maps.Symbol,
    label: {
      text: String(number),
      color: active ? "#ffffff" : "#1f2328",
      fontSize: "12px",
      fontWeight: "650",
    } satisfies google.maps.MarkerLabel,
    zIndex: active ? 2 : 1,
  };
}

/** Google draws markers on a canvas, so the theme's accent is read once per paint instead of via CSS. */
function accentColor() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--accent-strong").trim();
  return /^#[0-9a-f]{3,8}$/i.test(value) ? value : FALLBACK_ACCENT;
}
