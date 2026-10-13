import { isPlaceholderPlaceName } from "@/lib/travel-placeholders";

export type GoogleTravelMode = "walking" | "driving" | "transit";

export interface GoogleDirectionsStop {
  key: string | number;
  placeName: string;
  latitude: number | null;
  longitude: number | null;
  visitedAt?: string | null;
}

export interface GoogleDirectionsSegment {
  stops: GoogleDirectionsStop[];
  url: string;
}

export function isDirectionsStopLocated(stop: GoogleDirectionsStop): boolean {
  return !isPlaceholderPlaceName(stop.placeName)
    && typeof stop.latitude === "number" && Number.isFinite(stop.latitude)
    && typeof stop.longitude === "number" && Number.isFinite(stop.longitude)
    && Math.abs(stop.latitude) <= 90 && Math.abs(stop.longitude) <= 180;
}

/** Maps URLs preserve the selected stop order; Google chooses the travel route. */
export function buildGoogleDirectionsUrl(stops: GoogleDirectionsStop[], mode: GoogleTravelMode): string {
  const coordinate = (stop: GoogleDirectionsStop) => `${stop.latitude},${stop.longitude}`;
  const params = new URLSearchParams({
    api: "1",
    origin: coordinate(stops[0]),
    destination: coordinate(stops[stops.length - 1]),
    travelmode: mode,
  });
  if (stops.length > 2) params.set("waypoints", stops.slice(1, -1).map(coordinate).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Mobile browsers support at most three waypoints. Transit uses one leg at a
 * time because multi-stop transit routes are not supported. Unlocated stops
 * break the route so a missing destination never silently gets bypassed.
 */
export function buildGoogleDirectionsSegments(stops: GoogleDirectionsStop[], mode: GoogleTravelMode) {
  const segments: GoogleDirectionsSegment[] = [];
  const skipped: GoogleDirectionsStop[] = [];
  const maxStops = mode === "transit" ? 2 : 5;
  let run: GoogleDirectionsStop[] = [];

  const flush = () => {
    for (let start = 0; start < run.length - 1; start += maxStops - 1) {
      const segmentStops = run.slice(start, start + maxStops);
      segments.push({ stops: segmentStops, url: buildGoogleDirectionsUrl(segmentStops, mode) });
    }
    run = [];
  };

  for (const stop of stops) {
    if (!isDirectionsStopLocated(stop)) {
      flush();
      skipped.push(stop);
    } else {
      run.push(stop);
    }
  }
  flush();
  return { segments, skipped };
}
