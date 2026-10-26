import type { CountryFeature } from "@/lib/globe-geo";

/**
 * Plain geometry and text helpers for the globe: country centres from GeoJSON rings,
 * nearest-country lookup and great-circle distances. No three.js or React here.
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function getFeatureCode(feature: CountryFeature): string | null {
  return feature.properties.iso2 ?? feature.properties.nameEn ?? null;
}

export interface FeatureCenter {
  lat: number;
  lng: number;
}

export function getFeatureCenter(feature: CountryFeature): FeatureCenter | null {
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

export function getRingCenter(ring: unknown[]): { area: number; center: FeatureCenter } | null {
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

export function findNearestFeature(
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

export function angularDistanceDegrees(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export function normalizeLongitude(lng: number): number {
  return ((lng + 540) % 360) - 180;
}
