"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

interface Coordinate {
  latitude: number;
  longitude: number;
}

export default function MapTilerMapCanvas({
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
    const map = new MapLibreMap({
      container: mapElementRef.current,
      style: `https://api.maptiler.com/maps/streets-v4/style.json?key=${encodeURIComponent(apiKey)}`,
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: 16,
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
      localizeMapLabels(map);
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

/** Prefer Korean labels while keeping English/local names when a translation is absent. */
function localizeMapLabels(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type !== "symbol" || !layer.layout?.["text-field"]) continue;
    try {
      map.setLayoutProperty(layer.id, "text-field", [
        "coalesce",
        ["get", "name:ko"],
        ["get", "name:en"],
        ["get", "name"],
      ]);
    } catch {
      // A third-party style may lock one label layer; the rest of the map remains usable.
    }
  }
}
