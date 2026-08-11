"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";

import { globeTheme, visitedColor } from "@/components/globe/globeTheme";
import type { VisitedCountry } from "@/types";

/**
 * react-globe.gl touches `window` and creates a WebGL context on import, so it can never
 * run during SSR. Loading it here (inside an already-client component) also keeps three.js
 * out of the initial bundle - the globe chunk only downloads on a profile page.
 */
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <GlobeLoadingVeil />,
});

interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { iso2: string | null; iso3: string | null; nameEn: string; nameKo: string };
  geometry: unknown;
}

interface TravelGlobeProps {
  countries: VisitedCountry[];
  selectedCode: string | null;
  onSelect: (iso2Code: string | null) => void;
  onHover: (iso2Code: string | null) => void;
}

const GEO_URL = "/geo/countries.geo.json";

/** Camera altitude, in globe radii. */
const ALTITUDE_DEFAULT = 2.4;
const ALTITUDE_FOCUSED = 1.5;
const ALTITUDE_MIN = 0.6;
const ALTITUDE_MAX = 4;

export function TravelGlobe({ countries, selectedCode, onSelect, onHover }: TravelGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerElements = useRef(new Map<string, HTMLElement>());

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [geoFailed, setGeoFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const reduceMotion = usePrefersReducedMotion();

  // globe.gl callbacks (marker click handlers, control listeners) are registered once
  // against imperative DOM, so they read the latest values through refs rather than
  // closing over a stale render.
  const selectedRef = useRef(selectedCode);
  const onSelectRef = useRef(onSelect);

  useEffect(() => {
    selectedRef.current = selectedCode;
    onSelectRef.current = onSelect;
  }, [selectedCode, onSelect]);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitedCountry>();
    countries.forEach((country) => map.set(country.iso2Code, country));
    return map;
  }, [countries]);

  const maxTravelCount = useMemo(
    () => countries.reduce((max, country) => Math.max(max, country.travelCount), 1),
    [countries],
  );

  // --- data ---------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    fetch(GEO_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((collection: { features: CountryFeature[] }) => {
        if (!cancelled) {
          setFeatures(collection.features);
        }
      })
      .catch(() => {
        // The globe still renders as a sphere with markers; the country list stays usable.
        if (!cancelled) {
          setGeoFailed(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // --- sizing -------------------------------------------------------------

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const measure = () => {
      setSize({ width: element.clientWidth, height: element.clientHeight });
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // OrbitControls consumes wheel events across its entire canvas, including the empty
  // space around the sphere. Intercept only those misses before they reach the canvas;
  // not preventing the default lets the browser continue scrolling the page.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const handleWheelCapture = (event: WheelEvent) => {
      const globe = globeRef.current;
      if (!globe) {
        return;
      }

      const canvas = globe.renderer().domElement;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      const insideCanvas = x >= 0 && x <= bounds.width && y >= 0 && y <= bounds.height;

      if (!insideCanvas || globe.toGlobeCoords(x, y) === null) {
        event.stopPropagation();
      }
    };

    element.addEventListener("wheel", handleWheelCapture, { capture: true, passive: true });
    return () => element.removeEventListener("wheel", handleWheelCapture, true);
  }, []);

  // --- camera + controls --------------------------------------------------

  const handleReady = useCallback(() => {
    setReady(true);
    const controls = globeRef.current?.controls();
    if (!controls) {
      return;
    }
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.minDistance = 100 * (1 + ALTITUDE_MIN);
    controls.maxDistance = 100 * (1 + ALTITUDE_MAX);
    controls.autoRotateSpeed = 0.32;
    controls.autoRotate = !reduceMotion && selectedRef.current === null;

    // Any deliberate interaction ends the ambient spin for good.
    controls.addEventListener("start", () => {
      controls.autoRotate = false;
    });
  }, [reduceMotion]);

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (controls && selectedCode !== null) {
      controls.autoRotate = false;
    }
  }, [selectedCode]);

  // Fly to the selected country; return to the overview when the selection clears.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) {
      return;
    }
    const transition = reduceMotion ? 0 : 900;

    if (selectedCode === null) {
      globe.pointOfView({ altitude: ALTITUDE_DEFAULT }, transition);
      return;
    }
    const country = visitedByCode.get(selectedCode);
    if (country) {
      globe.pointOfView(
        { lat: country.latitude, lng: country.longitude, altitude: ALTITUDE_FOCUSED },
        transition,
      );
    }
  }, [selectedCode, ready, reduceMotion, visitedByCode]);

  // Stop rendering when the component goes away, so a navigation cannot leave a
  // requestAnimationFrame loop running against a detached canvas.
  useEffect(() => {
    const globe = globeRef.current;
    return () => {
      globe?.pauseAnimation();
    };
  }, [ready]);

  // --- markers ------------------------------------------------------------

  const markerData = useMemo(
    () => countries.map((country) => ({ ...country })),
    [countries],
  );

  const createMarker = useCallback(
    (data: object) => {
      const country = data as VisitedCountry;
      const element = document.createElement("div");
      element.className = "tg-marker";
      element.dataset.code = country.iso2Code;

      const ring = document.createElement("span");
      ring.className = "tg-marker__ring";
      ring.textContent = String(country.travelCount);
      element.appendChild(ring);

      const label = document.createElement("span");
      label.className = "tg-marker__label";
      label.textContent = country.nameKo;
      element.appendChild(label);

      element.addEventListener("click", (event) => {
        event.stopPropagation();
        onSelectRef.current(
          selectedRef.current === country.iso2Code ? null : country.iso2Code,
        );
      });
      element.addEventListener("pointerenter", () => setHoveredCode(country.iso2Code));
      element.addEventListener("pointerleave", () => setHoveredCode(null));

      markerElements.current.set(country.iso2Code, element);
      return element;
    },
    [],
  );

  // Markers are imperative DOM, so selection state is applied as a class rather than by
  // rebuilding the elements (which would drop them for a frame on every click).
  useEffect(() => {
    // globe.gl discards the DOM for countries that leave the data set, so drop those
    // entries here too - otherwise the map grows with every profile the user visits.
    const liveCodes = new Set(markerData.map((country) => country.iso2Code));
    markerElements.current.forEach((_, code) => {
      if (!liveCodes.has(code)) {
        markerElements.current.delete(code);
      }
    });

    markerElements.current.forEach((element, code) => {
      element.classList.toggle("is-selected", code === selectedCode);
      element.classList.toggle("is-hovered", code === hoveredCode);
      element.classList.toggle("is-dimmed", selectedCode !== null && code !== selectedCode);
    });
  }, [selectedCode, hoveredCode, markerData]);

  useEffect(() => {
    onHover(hoveredCode);
  }, [hoveredCode, onHover]);

  // --- polygon styling ----------------------------------------------------

  const capColor = useCallback(
    (polygon: object) => {
      const code = (polygon as CountryFeature).properties.iso2;
      const visited = code ? visitedByCode.get(code) : undefined;
      if (!visited) {
        return globeTheme.land;
      }
      if (code === selectedCode) {
        return globeTheme.selected;
      }
      if (code === hoveredCode) {
        return globeTheme.hovered;
      }
      return visitedColor(visited.travelCount, maxTravelCount);
    },
    [visitedByCode, selectedCode, hoveredCode, maxTravelCount],
  );

  const altitude = useCallback(
    (polygon: object) => {
      const code = (polygon as CountryFeature).properties.iso2;
      if (!code || !visitedByCode.has(code)) {
        return 0.006;
      }
      if (code === selectedCode) {
        return 0.055;
      }
      if (code === hoveredCode) {
        return 0.036;
      }
      return 0.018;
    },
    [visitedByCode, selectedCode, hoveredCode],
  );

  const polygonTooltip = useCallback(
    (polygon: object) => {
      const properties = (polygon as CountryFeature).properties;
      const visited = properties.iso2 ? visitedByCode.get(properties.iso2) : undefined;
      if (!visited) {
        return `<div class="tg-tip tg-tip--muted">${escapeHtml(properties.nameKo)}</div>`;
      }
      return `<div class="tg-tip">
        <strong>${escapeHtml(visited.nameKo)}</strong>
        <span>${escapeHtml(visited.nameEn)}</span>
        <em>여행 ${visited.travelCount}회 · 도시 ${visited.cityCount}곳</em>
      </div>`;
    },
    [visitedByCode],
  );

  const handlePolygonClick = useCallback((polygon: object) => {
    const code = (polygon as CountryFeature).properties.iso2;
    if (!code || !visitedByCode.has(code)) {
      return;
    }
    onSelectRef.current(selectedRef.current === code ? null : code);
  }, [visitedByCode]);

  const handlePolygonHover = useCallback(
    (polygon: object | null) => {
      const code = polygon ? (polygon as CountryFeature).properties.iso2 : null;
      setHoveredCode(code && visitedByCode.has(code) ? code : null);
    },
    [visitedByCode],
  );

  // Ambient pulse on visited countries. Purely decorative, so it is dropped entirely
  // when the visitor asked for reduced motion.
  const ringData = useMemo(
    () => (reduceMotion ? [] : markerData),
    [reduceMotion, markerData],
  );

  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(globeTheme.ocean),
        emissive: new THREE.Color("#040a12"),
        specular: new THREE.Color("#16283c"),
        shininess: 8,
      }),
    [],
  );

  // --- keyboard -----------------------------------------------------------

  const nudge = useCallback((deltaLat: number, deltaLng: number) => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }
    const pov = globe.pointOfView();
    globe.pointOfView(
      {
        lat: clamp(pov.lat + deltaLat, -85, 85),
        lng: pov.lng + deltaLng,
        altitude: pov.altitude,
      },
      220,
    );
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const globe = globeRef.current;
    if (!globe) {
      return;
    }
    const pov = globe.pointOfView();
    globe.pointOfView({ altitude: clamp(pov.altitude * factor, ALTITUDE_MIN, ALTITUDE_MAX) }, 220);
  }, []);

  const resetView = useCallback(() => {
    globeRef.current?.pointOfView({ lat: 20, lng: 130, altitude: ALTITUDE_DEFAULT }, 600);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const step = 12;
      const actions: Record<string, () => void> = {
        ArrowLeft: () => nudge(0, -step),
        ArrowRight: () => nudge(0, step),
        ArrowUp: () => nudge(step, 0),
        ArrowDown: () => nudge(-step, 0),
        "+": () => zoomBy(0.8),
        "=": () => zoomBy(0.8),
        "-": () => zoomBy(1.25),
        _: () => zoomBy(1.25),
        Home: resetView,
        "0": resetView,
      };
      const action = actions[event.key];
      if (action) {
        event.preventDefault();
        action();
      }
    },
    [nudge, zoomBy, resetView],
  );

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        tabIndex={0}
        role="application"
        aria-label="여행 지구본. 방향키로 회전, 플러스·마이너스 키로 확대·축소, 0 키로 초기화합니다. 국가 선택은 아래 목록에서도 할 수 있습니다."
        onKeyDown={handleKeyDown}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      >
        {size.width > 0 && size.height > 0 ? (
          <Globe
            ref={globeRef}
            width={size.width}
            height={size.height}
            backgroundColor="rgba(0,0,0,0)"
            globeMaterial={globeMaterial}
            showAtmosphere
            atmosphereColor={globeTheme.atmosphere}
            atmosphereAltitude={0.17}
            onGlobeReady={handleReady}
            polygonsData={features}
            polygonCapColor={capColor}
            polygonSideColor={() => "rgba(10, 21, 34, 0.55)"}
            polygonStrokeColor={() => globeTheme.landStroke}
            polygonAltitude={altitude}
            polygonLabel={polygonTooltip}
            polygonsTransitionDuration={reduceMotion ? 0 : 320}
            onPolygonClick={handlePolygonClick}
            onPolygonHover={handlePolygonHover}
            htmlElementsData={markerData}
            htmlLat={(d: object) => (d as VisitedCountry).latitude}
            htmlLng={(d: object) => (d as VisitedCountry).longitude}
            htmlAltitude={0.06}
            htmlElement={createMarker}
            htmlElementVisibilityModifier={(element, isVisible) => {
              // Hide markers that sit on the far side of the sphere.
              element.style.opacity = isVisible ? "1" : "0";
              element.style.pointerEvents = isVisible ? "auto" : "none";
            }}
            ringsData={ringData}
            ringLat={(d: object) => (d as VisitedCountry).latitude}
            ringLng={(d: object) => (d as VisitedCountry).longitude}
            ringColor={() => (t: number) => `rgba(232, 112, 58, ${Math.max(0, 1 - t) * 0.32})`}
            ringMaxRadius={3.6}
            ringPropagationSpeed={1.1}
            ringRepeatPeriod={2600}
          />
        ) : null}
      </div>

      {!ready ? <GlobeLoadingVeil /> : null}

      <GlobeViewControls onZoomIn={() => zoomBy(0.8)} onZoomOut={() => zoomBy(1.25)} onReset={resetView} />

      {geoFailed ? (
        <p
          role="status"
          className="text-content-faint absolute bottom-3 left-1/2 -translate-x-1/2 text-center text-[0.72rem]"
        >
          국가 경계 데이터를 불러오지 못했습니다. 아래 목록에서 국가를 선택할 수 있습니다.
        </p>
      ) : null}
    </div>
  );
}

function GlobeViewControls({
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  const buttonClass =
    "border-border-strong bg-background/70 text-content-muted flex h-8 w-8 items-center justify-center rounded-md border text-[0.9rem] backdrop-blur transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]";

  return (
    <div
      role="toolbar"
      aria-label="지구본 확대·축소"
      className="absolute top-4 right-4 z-10 flex flex-col gap-1.5"
    >
      <button type="button" className={buttonClass} onClick={onZoomIn} aria-label="지구본 확대">
        +
      </button>
      <button type="button" className={buttonClass} onClick={onZoomOut} aria-label="지구본 축소">
        −
      </button>
      <button
        type="button"
        className={`${buttonClass} text-[0.6rem] tracking-wide`}
        onClick={onReset}
        aria-label="지구본 처음 위치로"
      >
        1:1
      </button>
    </div>
  );
}

function GlobeLoadingVeil() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <div className="h-[52%] max-h-[420px] min-h-[180px] aspect-square animate-pulse rounded-full bg-[radial-gradient(circle_at_35%_30%,rgba(47,109,158,0.22),rgba(10,21,34,0.6)_58%,transparent_72%)]" />
    </div>
  );
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

/**
 * Tracks the OS "reduce motion" setting, including changes made while the page is open.
 *
 * `useSyncExternalStore` rather than an effect: matchMedia is an external store, and this
 * avoids the render-then-correct flash where the globe starts spinning for one frame
 * before the preference is read.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    // Never assume reduced motion during SSR; the client corrects on hydration.
    () => false,
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
