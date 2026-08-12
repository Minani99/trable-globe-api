"use client";

import { useEffect, useMemo, useState } from "react";

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

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 560;
/** Degrees of span below which the map would zoom in past anything recognisable. */
const MIN_SPAN_DEGREES = 3.5;

/**
 * Route diagram for one trip.
 *
 * Reuses the same country outlines the globe draws, projected flat and cropped to the
 * stops - a regional map rather than a second map engine. Equirectangular is a deliberate
 * simplification: over the few degrees a single trip spans, the distortion is invisible,
 * and it keeps the projection to two lines of arithmetic.
 */
export function TravelRouteMap({ places, countryCodes }: TravelRouteMapProps) {
  const [features, setFeatures] = useState<CountryFeature[]>([]);

  // Depend on the codes themselves rather than the array instance: callers build this
  // list inline, so a new array on every render would refetch the atlas each time.
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
        if (cancelled) {
          return;
        }
        setFeatures(
          collection.features.filter(
            (entry) => entry.properties.iso2 !== null && wanted.has(entry.properties.iso2),
          ),
        );
      })
      // Without outlines the diagram still shows the stops and the route between them.
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [places, countryKey]);

  const projection = useMemo(() => createProjection(places), [places]);

  const countryPaths = useMemo(() => {
    if (!projection) {
      return [];
    }
    return features.flatMap((entry) => toPathStrings(entry.geometry, projection));
  }, [features, projection]);

  if (!projection || places.length === 0) {
    return null;
  }

  const points = places.map((place) => ({
    place,
    ...projection(place.longitude, place.latitude),
  }));

  const routeLine = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  return (
    <figure className="m-0">
      <div className="border-border-subtle bg-[var(--globe-ocean)] overflow-hidden rounded-[14px] border">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="block h-auto w-full"
          role="img"
          aria-label={`${places.map((place) => place.placeName).join(", ")}을(를) 잇는 여행 경로 지도`}
        >
          <g>
            {countryPaths.map((path, index) => (
              <path
                key={index}
                d={path}
                fill="var(--globe-land)"
                stroke="var(--border-strong)"
                strokeWidth={1}
                strokeLinejoin="round"
              />
            ))}
          </g>

          {points.length > 1 ? (
            <polyline
              points={routeLine}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.6}
              strokeDasharray="6 6"
              strokeOpacity={0.75}
            />
          ) : null}

          {points.map((point, index) => (
            <g key={point.place.id}>
              <circle cx={point.x} cy={point.y} r={12} fill="var(--accent)" fillOpacity={0.16} />
              <circle
                cx={point.x}
                cy={point.y}
                r={4.5}
                fill="var(--accent-strong)"
                stroke="var(--background)"
                strokeWidth={1.5}
              />
              <text
                x={point.x + 12}
                y={point.y + 4}
                fill="var(--text-primary)"
                fontSize={14}
                fontFamily="var(--font-sans)"
              >
                {index + 1}. {point.place.placeName}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <figcaption className="text-caption mt-2">
        번호는 방문 순서입니다. 자세한 내용은 아래 방문 장소 목록에서 확인할 수 있습니다.
      </figcaption>
    </figure>
  );
}

type Projection = (lng: number, lat: number) => { x: number; y: number };

/**
 * Fits the stops into the viewBox.
 *
 * The bounds come from the places, not the countries: a trip to Miami should not be drawn
 * at a scale that fits Alaska. Country outlines are simply clipped by the viewBox.
 */
function createProjection(places: TravelPlace[]): Projection | null {
  if (places.length === 0) {
    return null;
  }

  // Longitudes live on a circle. Choosing the smallest arc prevents a Tokyo → San
  // Francisco trip from looking 340° wide just because it crosses the date line.
  const lngs = unwrapToSmallestArc(places.map((place) => place.longitude));
  const lats = places.map((place) => place.latitude);

  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;

  const rawSpanLng = Math.max(...lngs) - Math.min(...lngs);
  const rawSpanLat = Math.max(...lats) - Math.min(...lats);

  // Pad generously so a stop never sits on the edge, and enforce a floor so a
  // single-city trip still shows recognisable coastline around it.
  const spanLng = Math.max(rawSpanLng * 2.4, MIN_SPAN_DEGREES);
  const spanLat = Math.max(rawSpanLat * 2.4, MIN_SPAN_DEGREES);

  // One scale for both axes keeps the shapes from stretching.
  const scale = Math.min(VIEW_WIDTH / spanLng, VIEW_HEIGHT / spanLat);

  return (lng, lat) => ({
    x: VIEW_WIDTH / 2 + (nearestEquivalentLongitude(lng, centerLng) - centerLng) * scale,
    y: VIEW_HEIGHT / 2 - (lat - centerLat) * scale,
  });
}

/** Places every longitude on the shortest continuous arc that contains them all. */
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

/** Selects the ±360° representation nearest the projection centre. */
function nearestEquivalentLongitude(longitude: number, center: number): number {
  const normalized = normalizeLongitude(longitude);
  return normalized + 360 * Math.round((center - normalized) / 360);
}

function toPathStrings(geometry: CountryFeature["geometry"], project: Projection): string[] {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

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
