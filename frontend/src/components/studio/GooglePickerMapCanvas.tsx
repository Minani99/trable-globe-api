"use client";

import { useEffect, useRef } from "react";

import { googleMapsApiKey, loadGoogleMaps, onGoogleMapsAuthFailure } from "@/lib/google-maps-loader";

interface Coordinate {
  latitude: number;
  longitude: number;
}

const LOAD_TIMEOUT_MS = 12_000;

/**
 * Full-screen Google map for the location dialog. The dialog's centre pin marks the
 * chosen point, so only the camera centre is reported back.
 */
export default function GooglePickerMapCanvas({
  initialCenter,
  onCenterChange,
  onUnavailable,
}: {
  initialCenter: Coordinate;
  onCenterChange: (coordinate: Coordinate) => void;
  onUnavailable: () => void;
}) {
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!googleMapsApiKey || !elementRef.current) return;
    const element = elementRef.current;
    let cancelled = false;
    let listener: google.maps.MapsEventListener | null = null;
    const fail = () => {
      if (cancelled) return;
      cancelled = true;
      onUnavailable();
    };
    const timer = window.setTimeout(fail, LOAD_TIMEOUT_MS);
    const stopListening = onGoogleMapsAuthFailure(fail);

    async function show() {
      await loadGoogleMaps(googleMapsApiKey!);
      const { Map } = await (google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>);
      if (cancelled) return;
      const map = new Map(element, {
        center: { lat: initialCenter.latitude, lng: initialCenter.longitude },
        zoom: 16,
        clickableIcons: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        // The dialog covers the page, so one finger always moves the map.
        gestureHandling: "greedy",
      });
      listener = map.addListener("idle", () => {
        const center = map.getCenter();
        if (center) onCenterChange({ latitude: center.lat(), longitude: center.lng() });
      });
      window.clearTimeout(timer);
    }

    show().catch(fail);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopListening();
      listener?.remove();
    };
  }, [initialCenter.latitude, initialCenter.longitude, onCenterChange, onUnavailable]);

  return <div ref={elementRef} className="place-map-dialog__provider-map" aria-label="Google 지도" />;
}
