"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import * as THREE from "three";
import type { GlobeMethods } from "react-globe.gl";

import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";
import { globeThemes, visitedColor } from "@/components/globe/globeTheme";
import type { GlobeRouteArc } from "@/lib/globeTimeline";
import { useColorTheme } from "@/lib/theme";
import type { VisitedCountry } from "@/types";

/**
 * react-globe.gl touches `window` and creates a WebGL context on import, so it can never
 * run during SSR. Loading it here (inside an already-client component) also keeps three.js
 * out of the initial bundle - the globe chunk only downloads on a profile page.
 */
const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  // The parent owns the loading state so the bundle fallback and WebGL-ready
  // fallback never render two stacked indicators.
  loading: () => null,
});

interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { iso2: string | null; iso3: string | null; nameEn: string; nameKo: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

export interface GlobeCountryHover {
  code: string;
  nameKo: string;
  nameEn: string;
}

interface TravelGlobeProps {
  countries: VisitedCountry[];
  selectedCode: string | null;
  focusCode?: string | null;
  recentCode?: string | null;
  routeArcs?: GlobeRouteArc[];
  onSelect: (iso2Code: string | null) => void;
  onHover: (iso2Code: string | null) => void;
  onCountryHover?: (country: GlobeCountryHover | null) => void;
  onCountryCenter?: (country: GlobeCountryHover | null) => void;
  onCountrySelect?: (country: GlobeCountryHover | null) => void;
  mode?: "travel" | "world";
}

const GEO_URL = "/geo/countries.geo.json";

/** Camera altitude, in globe radii. */
const ALTITUDE_DEFAULT = 2.4;
const ALTITUDE_FOCUSED = 1.5;
const ALTITUDE_MIN = 0.6;
const ALTITUDE_MAX = 4;
const INITIAL_VIEW = { lat: 24, lng: 127, altitude: ALTITUDE_DEFAULT } as const;
const LOADING_INDICATOR_MINIMUM_MS = 650;
const AUTO_ROTATE_RESUME_DELAY_MS = 6_000;
const CENTER_HIGHLIGHT_INTERVAL_MS = 180;
const CENTER_HIGHLIGHT_MAX_DISTANCE_DEGREES = 24;
/** Makes small countries tappable without turning broad ocean taps into selections. */
const WORLD_SURFACE_SNAP_DISTANCE_DEGREES = 11;

export function TravelGlobe({
  countries,
  selectedCode,
  focusCode = null,
  recentCode = null,
  routeArcs = [],
  onSelect,
  onHover,
  onCountryHover,
  onCountryCenter,
  onCountrySelect,
  mode = "travel",
}: TravelGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const markerElements = useRef(new Map<string, HTMLElement>());
  const loadingStartedAt = useRef<number | null>(null);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRotateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRotateFrame = useRef<number | null>(null);
  const lastRotationAt = useRef<number | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [features, setFeatures] = useState<CountryFeature[]>([]);
  const [geoFailed, setGeoFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [autoRotating, setAutoRotating] = useState(false);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [centeredCode, setCenteredCode] = useState<string | null>(null);
  const reduceMotion = usePrefersReducedMotion();
  const colorTheme = useColorTheme();
  const globeTheme = globeThemes[colorTheme];
  const isWorldExplorer = mode === "world";

  // globe.gl callbacks (marker click handlers, control listeners) are registered once
  // against imperative DOM, so they read the latest values through refs rather than
  // closing over a stale render.
  const selectedRef = useRef(selectedCode);
  const focusRef = useRef(focusCode);
  const onSelectRef = useRef(onSelect);
  const reduceMotionRef = useRef(reduceMotion);

  useEffect(() => {
    selectedRef.current = selectedCode;
    focusRef.current = focusCode;
    onSelectRef.current = onSelect;
  }, [focusCode, selectedCode, onSelect]);

  useEffect(() => {
    reduceMotionRef.current = reduceMotion;
  }, [reduceMotion]);

  const cancelAmbientRotation = useCallback(() => {
    if (autoRotateFrame.current !== null) {
      cancelAnimationFrame(autoRotateFrame.current);
      autoRotateFrame.current = null;
    }
    lastRotationAt.current = null;
  }, []);

  const stopAmbientRotation = useCallback(() => {
    cancelAmbientRotation();
    setAutoRotating(false);
  }, [cancelAmbientRotation]);

  const startAmbientRotation = useCallback(() => {
    if (autoRotateFrame.current !== null || reduceMotionRef.current || selectedRef.current !== null || focusRef.current !== null) return;
    setAutoRotating(true);

    const rotate = (time: number) => {
      const globe = globeRef.current;
      if (!globe || reduceMotionRef.current || selectedRef.current !== null || focusRef.current !== null) {
        autoRotateFrame.current = null;
        lastRotationAt.current = null;
        setAutoRotating(false);
        return;
      }
      if (lastRotationAt.current !== null) {
        const elapsed = Math.min(50, time - lastRotationAt.current);
        const view = globe.pointOfView();
        globe.pointOfView({ ...view, lng: view.lng - elapsed * 0.002 }, 0);
      }
      lastRotationAt.current = time;
      autoRotateFrame.current = requestAnimationFrame(rotate);
    };

    autoRotateFrame.current = requestAnimationFrame(rotate);
  }, []);

  const clearRotationResume = useCallback(() => {
    if (autoRotateTimer.current) {
      clearTimeout(autoRotateTimer.current);
      autoRotateTimer.current = null;
    }
  }, []);

  const scheduleAmbientRotation = useCallback(() => {
    clearRotationResume();
    if (reduceMotionRef.current || selectedRef.current !== null || focusRef.current !== null) return;
    autoRotateTimer.current = setTimeout(startAmbientRotation, AUTO_ROTATE_RESUME_DELAY_MS);
  }, [clearRotationResume, startAmbientRotation]);

  const visitedByCode = useMemo(() => {
    const map = new Map<string, VisitedCountry>();
    countries.forEach((country) => map.set(country.iso2Code, country));
    return map;
  }, [countries]);

  const featureCenters = useMemo(
    () =>
      features.flatMap((feature) => {
        const code = getFeatureCode(feature);
        const center = getFeatureCenter(feature);
        return code && center ? [{ code, center, feature }] : [];
      }),
    [features],
  );

  const featureCenterByCode = useMemo(
    () => new Map(featureCenters.map(({ code, center }) => [code, center])),
    [featureCenters],
  );

  const centerCandidates = useMemo(
    () => isWorldExplorer
      ? featureCenters
      : featureCenters.filter(({ code }) => visitedByCode.has(code)),
    [featureCenters, isWorldExplorer, visitedByCode],
  );

  const activeCode = selectedCode ?? focusCode;

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
    // Keep very fast loads from flashing the indicator for only a single frame.
    // A short minimum makes the transition readable without making the globe feel slow.
    const elapsed = loadingStartedAt.current === null ? 0 : Date.now() - loadingStartedAt.current;
    const remaining = Math.max(0, LOADING_INDICATOR_MINIMUM_MS - elapsed);
    readyTimer.current = setTimeout(() => setReady(true), remaining);

    // A Korean archive should introduce the world from East Asia, not the library's
    // default Greenwich-facing camera.
    globeRef.current?.pointOfView(INITIAL_VIEW, 0);
    const shouldRotate = !reduceMotion && selectedRef.current === null;
    if (shouldRotate) startAmbientRotation();

    const controls = globeRef.current?.controls();
    if (!controls) {
      return;
    }
    controls.enableDamping = true;
    controls.dampingFactor = 0.12;
    controls.enablePan = false;
    controls.minDistance = 100 * (1 + ALTITUDE_MIN);
    controls.maxDistance = 100 * (1 + ALTITUDE_MAX);
  }, [reduceMotion, startAmbientRotation]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const beginInteraction = () => {
      clearRotationResume();
      stopAmbientRotation();
    };
    const endInteraction = () => scheduleAmbientRotation();
    const handleWheel = () => {
      beginInteraction();
      scheduleAmbientRotation();
    };

    element.addEventListener("pointerdown", beginInteraction);
    element.addEventListener("pointerup", endInteraction);
    element.addEventListener("pointercancel", endInteraction);
    element.addEventListener("wheel", handleWheel, { passive: true });
    return () => {
      element.removeEventListener("pointerdown", beginInteraction);
      element.removeEventListener("pointerup", endInteraction);
      element.removeEventListener("pointercancel", endInteraction);
      element.removeEventListener("wheel", handleWheel);
    };
  }, [clearRotationResume, scheduleAmbientRotation, stopAmbientRotation]);

  useEffect(
    () => {
      loadingStartedAt.current = Date.now();

      return () => {
        if (readyTimer.current) {
          clearTimeout(readyTimer.current);
        }
        clearRotationResume();
        cancelAmbientRotation();
      };
    },
    [cancelAmbientRotation, clearRotationResume],
  );

  useEffect(() => {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    clearRotationResume();
    if (reduceMotion || activeCode !== null) {
      cancelAmbientRotation();
      const stateTimer = setTimeout(() => setAutoRotating(false), 0);
      return () => clearTimeout(stateTimer);
    }
    if (isWorldExplorer) {
      const rotationTimer = setTimeout(startAmbientRotation, 0);
      return () => clearTimeout(rotationTimer);
    }
    scheduleAmbientRotation();
  }, [
    cancelAmbientRotation,
    clearRotationResume,
    isWorldExplorer,
    reduceMotion,
    scheduleAmbientRotation,
    activeCode,
    startAmbientRotation,
  ]);

  // Fly to the selected country; return to the overview when the selection clears.
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe || !ready) {
      return;
    }
    const transition = reduceMotion ? 0 : 900;

    if (activeCode === null) {
      if (!isWorldExplorer) globe.pointOfView(INITIAL_VIEW, transition);
      return;
    }
    const country = visitedByCode.get(activeCode);
    if (country) {
      globe.pointOfView(
        { lat: country.latitude, lng: country.longitude, altitude: ALTITUDE_FOCUSED },
        transition,
      );
      return;
    }
    const center = isWorldExplorer ? featureCenterByCode.get(activeCode) : undefined;
    if (center) {
      globe.pointOfView({ ...center, altitude: ALTITUDE_FOCUSED }, transition);
    }
  }, [activeCode, featureCenterByCode, isWorldExplorer, ready, reduceMotion, visitedByCode]);

  // While the globe turns on its own, softly identify the country nearest the camera's
  // center. The interval is deliberately low-frequency: it feels live without causing a
  // React render for every WebGL animation frame.
  useEffect(() => {
    if (!ready || !autoRotating || activeCode !== null || centerCandidates.length === 0) return;
    let announcedCode: string | null = null;

    const updateCenteredCountry = () => {
      const view = globeRef.current?.pointOfView();
      if (!view) return;
      const nearest = findNearestFeature(centerCandidates, view.lat, view.lng);
      const next = nearest && nearest.distance <= CENTER_HIGHLIGHT_MAX_DISTANCE_DEGREES
        ? nearest.item
        : null;
      const nextCode = next?.code ?? null;
      if (nextCode === announcedCode) return;
      announcedCode = nextCode;
      setCenteredCode(nextCode);
      onCountryCenter?.(
        next
          ? {
              code: next.code,
              nameKo: next.feature.properties.nameKo,
              nameEn: next.feature.properties.nameEn,
            }
          : null,
      );
    };

    updateCenteredCountry();
    const interval = setInterval(updateCenteredCountry, CENTER_HIGHLIGHT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeCode, autoRotating, centerCandidates, onCountryCenter, ready]);

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
      element.classList.toggle("is-timeline", code === focusCode);
      element.classList.toggle("is-recent", code === recentCode);
      element.classList.toggle("is-hovered", code === hoveredCode);
      element.classList.toggle("is-dimmed", activeCode !== null && code !== activeCode);
    });
  }, [activeCode, focusCode, hoveredCode, markerData, recentCode, selectedCode]);

  useEffect(() => {
    onHover(hoveredCode);
  }, [hoveredCode, onHover]);

  // --- polygon styling ----------------------------------------------------

  const capColor = useCallback(
    (polygon: object) => {
      const code = getFeatureCode(polygon as CountryFeature);
      const visited = code ? visitedByCode.get(code) : undefined;
      if (code === selectedCode) {
        return globeTheme.selected;
      }
      if (selectedCode === null && code === focusCode) {
        return globeTheme.recent;
      }
      if (activeCode === null && code === hoveredCode) {
        return globeTheme.hovered;
      }
      if (activeCode === null && autoRotating && code === centeredCode) {
        return globeTheme.hovered;
      }
      if (!isWorldExplorer && code === recentCode) return globeTheme.recent;
      if (!visited) {
        return globeTheme.land;
      }
      return visitedColor(visited.travelCount, maxTravelCount, globeTheme);
    },
    [
      visitedByCode,
      activeCode,
      selectedCode,
      focusCode,
      recentCode,
      hoveredCode,
      isWorldExplorer,
      autoRotating,
      centeredCode,
      maxTravelCount,
      globeTheme,
    ],
  );

  const altitude = useCallback(
    (polygon: object) => {
      const code = getFeatureCode(polygon as CountryFeature);
      if (!code || (!isWorldExplorer && !visitedByCode.has(code))) {
        return 0.006;
      }
      if (code === selectedCode) {
        return 0.055;
      }
      if (selectedCode === null && code === focusCode) {
        return 0.045;
      }
      if (activeCode === null && code === hoveredCode) {
        return 0.036;
      }
      if (activeCode === null && autoRotating && code === centeredCode) {
        return 0.03;
      }
      if (!isWorldExplorer && code === recentCode) return 0.026;
      return 0.018;
    },
    [activeCode, autoRotating, centeredCode, focusCode, hoveredCode, isWorldExplorer, recentCode, selectedCode, visitedByCode],
  );

  const polygonTooltip = useCallback(
    (polygon: object) => {
      const properties = (polygon as CountryFeature).properties;
      const code = getFeatureCode(polygon as CountryFeature);
      const visited = code ? visitedByCode.get(code) : undefined;
      if (isWorldExplorer) {
        if (selectedCode !== null && code !== selectedCode) return "";
        return `<div class="tg-tip">
          <strong>${escapeHtml(properties.nameKo ?? properties.nameEn)}</strong>
          <span>${escapeHtml(properties.nameEn)}</span>
          <em>${code === selectedCode ? "다시 클릭해 선택 해제" : "클릭해 위치 고정"}</em>
        </div>`;
      }
      if (!visited) {
        return `<div class="tg-tip tg-tip--muted">${escapeHtml(properties.nameKo)}</div>`;
      }
      return `<div class="tg-tip">
        <strong>${escapeHtml(visited.nameKo)}</strong>
        <span>${escapeHtml(visited.nameEn)}</span>
        <em>여행 ${visited.travelCount}회 · 도시 ${visited.cityCount}곳</em>
      </div>`;
    },
    [visitedByCode, isWorldExplorer, selectedCode],
  );

  const selectWorldFeature = useCallback((feature: CountryFeature) => {
    const code = getFeatureCode(feature);
    if (!code || (!isWorldExplorer && !visitedByCode.has(code))) {
      return;
    }
    const nextCode = selectedRef.current === code ? null : code;
    selectedRef.current = nextCode;
    clearRotationResume();
    stopAmbientRotation();
    setHoveredCode(null);
    onCountryHover?.(null);
    onSelectRef.current(nextCode);
    onCountrySelect?.(
      nextCode
        ? { code: nextCode, nameKo: feature.properties.nameKo, nameEn: feature.properties.nameEn }
        : null,
    );
    if (isWorldExplorer && nextCode === null && !reduceMotionRef.current) {
      setTimeout(startAmbientRotation, 0);
    }
  }, [
    clearRotationResume,
    isWorldExplorer,
    onCountryHover,
    onCountrySelect,
    startAmbientRotation,
    stopAmbientRotation,
    visitedByCode,
  ]);

  const handlePolygonClick = useCallback((polygon: object) => {
    selectWorldFeature(polygon as CountryFeature);
  }, [selectWorldFeature]);

  const handleGlobeClick = useCallback((coords: { lat: number; lng: number }) => {
    if (!isWorldExplorer) return;
    const nearest = findNearestFeature(featureCenters, coords.lat, coords.lng);
    if (!nearest || nearest.distance > WORLD_SURFACE_SNAP_DISTANCE_DEGREES) return;
    selectWorldFeature(nearest.item.feature);
  }, [featureCenters, isWorldExplorer, selectWorldFeature]);

  const handlePolygonHover = useCallback(
    (polygon: object | null) => {
      if (isWorldExplorer && selectedRef.current !== null) {
        setHoveredCode(null);
        onCountryHover?.(null);
        return;
      }
      const code = polygon ? getFeatureCode(polygon as CountryFeature) : null;
      const nextCode = code && (isWorldExplorer || visitedByCode.has(code)) ? code : null;
      setHoveredCode(nextCode);
      onCountryHover?.(
        polygon && nextCode
          ? {
              code: nextCode,
              nameKo: (polygon as CountryFeature).properties.nameKo,
              nameEn: (polygon as CountryFeature).properties.nameEn,
            }
          : null,
      );
      if (isWorldExplorer) {
        if (nextCode) {
          clearRotationResume();
          stopAmbientRotation();
        } else {
          scheduleAmbientRotation();
        }
      }
    },
    [
      clearRotationResume,
      isWorldExplorer,
      onCountryHover,
      scheduleAmbientRotation,
      stopAmbientRotation,
      visitedByCode,
    ],
  );

  // Ambient pulse on visited countries. Purely decorative, so it is dropped entirely
  // when the visitor asked for reduced motion.
  const ringData = useMemo(
    () => reduceMotion || !recentCode
      ? []
      : markerData.filter((country) => country.iso2Code === recentCode),
    [markerData, recentCode, reduceMotion],
  );

  const arcTooltip = useCallback((arc: object) => {
    const route = arc as GlobeRouteArc;
    return `<div class="tg-tip"><strong>${escapeHtml(route.fromLabel)}</strong><span>→ ${escapeHtml(route.toLabel)}</span></div>`;
  }, []);

  const globeMaterial = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(globeTheme.ocean),
        emissive: new THREE.Color(globeTheme.emissive),
        specular: new THREE.Color(globeTheme.specular),
        shininess: globeTheme.shininess,
      }),
    [globeTheme],
  );

  useEffect(() => () => globeMaterial.dispose(), [globeMaterial]);

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
    globeRef.current?.pointOfView(INITIAL_VIEW, 600);
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
        aria-busy={!ready}
        data-auto-rotating={autoRotating && !reduceMotion && activeCode === null}
        aria-label={isWorldExplorer
          ? "세계 랜드마크 지구본. 모든 국가에 마우스를 올려 대표 장소를 확인할 수 있습니다. 방향키로 회전하고 플러스·마이너스 키로 확대·축소합니다."
          : "여행 지구본. 방향키로 회전, 플러스·마이너스 키로 확대·축소, 0 키로 초기화합니다. 국가 선택은 아래 목록에서도 할 수 있습니다."}
        onKeyDown={handleKeyDown}
        className={`h-full w-full ${isWorldExplorer ? "cursor-pointer active:cursor-grabbing" : "cursor-grab active:cursor-grabbing"}`}
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
            arcsData={routeArcs}
            arcStartLat={(d: object) => (d as GlobeRouteArc).startLat}
            arcStartLng={(d: object) => (d as GlobeRouteArc).startLng}
            arcEndLat={(d: object) => (d as GlobeRouteArc).endLat}
            arcEndLng={(d: object) => (d as GlobeRouteArc).endLng}
            arcColor={() => [globeTheme.visitedRamp[1], globeTheme.recent]}
            arcAltitudeAutoScale={0.24}
            arcStroke={0.38}
            arcDashLength={reduceMotion ? 1 : 0.58}
            arcDashGap={reduceMotion ? 0 : 0.22}
            arcDashAnimateTime={reduceMotion ? 0 : 1_800}
            arcsTransitionDuration={reduceMotion ? 0 : 420}
            arcLabel={arcTooltip}
            polygonsData={features}
            polygonCapColor={capColor}
            polygonSideColor={() => globeTheme.side}
            polygonStrokeColor={() => globeTheme.landStroke}
            polygonAltitude={altitude}
            polygonLabel={polygonTooltip}
            polygonsTransitionDuration={reduceMotion ? 0 : 320}
            onPolygonClick={handlePolygonClick}
            onPolygonHover={handlePolygonHover}
            onGlobeClick={handleGlobeClick}
            htmlElementsData={markerData}
            htmlLat={(d: object) => (d as VisitedCountry).latitude}
            htmlLng={(d: object) => (d as VisitedCountry).longitude}
            htmlAltitude={0.06}
            htmlElement={createMarker}
            htmlElementVisibilityModifier={(element, isVisible) => {
              // Hide markers that sit on the far side of the sphere.
              element.classList.toggle("is-behind", !isVisible);
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

      {!ready ? <GlobeLoadingIndicator minimal className="absolute inset-0 z-20" /> : null}

      {ready ? (
        <GlobeViewControls
          onZoomIn={() => zoomBy(0.8)}
          onZoomOut={() => zoomBy(1.25)}
          onReset={resetView}
        />
      ) : null}

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
      className="globe-view-controls absolute top-4 right-4 z-10 flex flex-col gap-1.5"
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

function getFeatureCode(feature: CountryFeature): string | null {
  return feature.properties.iso2 ?? feature.properties.nameEn ?? null;
}

interface FeatureCenter {
  lat: number;
  lng: number;
}

function getFeatureCenter(feature: CountryFeature): FeatureCenter | null {
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  if (!Array.isArray(polygons)) return null;

  let largest: { area: number; center: FeatureCenter } | null = null;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon) || !Array.isArray(polygon[0])) continue;
    const candidate = getRingCenter(polygon[0]);
    if (candidate && (!largest || candidate.area > largest.area)) largest = candidate;
  }
  return largest?.center ?? null;
}

function getRingCenter(ring: unknown[]): { area: number; center: FeatureCenter } | null {
  const points = ring.filter(
    (point): point is [number, number] =>
      Array.isArray(point) && typeof point[0] === "number" && typeof point[1] === "number",
  );
  if (points.length < 3) return null;

  const unwrapped: [number, number][] = [];
  let previousLng = points[0][0];
  for (const [rawLng, lat] of points) {
    let lng = rawLng;
    while (lng - previousLng > 180) lng -= 360;
    while (lng - previousLng < -180) lng += 360;
    unwrapped.push([lng, lat]);
    previousLng = lng;
  }

  let twiceArea = 0;
  let weightedLng = 0;
  let weightedLat = 0;
  for (let index = 0; index < unwrapped.length; index += 1) {
    const [x1, y1] = unwrapped[index];
    const [x2, y2] = unwrapped[(index + 1) % unwrapped.length];
    const cross = x1 * y2 - x2 * y1;
    twiceArea += cross;
    weightedLng += (x1 + x2) * cross;
    weightedLat += (y1 + y2) * cross;
  }

  if (Math.abs(twiceArea) < 1e-7) {
    const [lng, lat] = unwrapped[0];
    return { area: 0, center: { lat, lng: normalizeLongitude(lng) } };
  }
  return {
    area: Math.abs(twiceArea),
    center: {
      lat: weightedLat / (3 * twiceArea),
      lng: normalizeLongitude(weightedLng / (3 * twiceArea)),
    },
  };
}

function findNearestFeature(
  features: { code: string; center: FeatureCenter; feature: CountryFeature }[],
  lat: number,
  lng: number,
) {
  let nearest: { item: (typeof features)[number]; distance: number } | null = null;
  for (const item of features) {
    const distance = angularDistanceDegrees(lat, lng, item.center.lat, item.center.lng);
    if (!nearest || distance < nearest.distance) nearest = { item, distance };
  }
  return nearest;
}

function angularDistanceDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = Math.PI / 180;
  const phi1 = lat1 * toRadians;
  const phi2 = lat2 * toRadians;
  const deltaPhi = (lat2 - lat1) * toRadians;
  const deltaLambda = (lng2 - lng1) * toRadians;
  const a = Math.sin(deltaPhi / 2) ** 2
    + Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;
  const clamped = Math.min(1, Math.max(0, a));
  return (2 * Math.atan2(Math.sqrt(clamped), Math.sqrt(1 - clamped))) / toRadians;
}

function normalizeLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}
