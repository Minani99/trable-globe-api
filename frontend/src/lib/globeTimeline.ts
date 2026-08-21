import type { TravelSummary, VisitedCountry } from "@/types";

export interface GlobeRouteArc {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  fromLabel: string;
  toLabel: string;
  momentIndex: number;
}

export interface GlobeTimelineMoment {
  index: number;
  date: string;
  year: number;
  travel: TravelSummary;
  focusCode: string | null;
  routeArcCount: number;
}

export interface GlobeTimeline {
  travels: TravelSummary[];
  moments: GlobeTimelineMoment[];
  arcs: GlobeRouteArc[];
}

interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

const MAX_VISIBLE_ROUTE_ARCS = 80;

export function buildGlobeTimeline(travels: TravelSummary[]): GlobeTimeline {
  const orderedTravels = [...travels].sort((left, right) => (
    left.startDate.localeCompare(right.startDate) || left.id - right.id
  ));
  const moments: GlobeTimelineMoment[] = [];
  const arcs: GlobeRouteArc[] = [];
  let previousPoint: RoutePoint | null = null;

  orderedTravels.forEach((travel, momentIndex) => {
    const points = routePointsForTravel(travel);
    for (const point of points) {
      if (previousPoint && !samePoint(previousPoint, point)) {
        arcs.push({
          id: `${travel.id}-${arcs.length}`,
          startLat: previousPoint.lat,
          startLng: previousPoint.lng,
          endLat: point.lat,
          endLng: point.lng,
          fromLabel: previousPoint.label,
          toLabel: point.label,
          momentIndex,
        });
      }
      previousPoint = point;
    }

    moments.push({
      index: momentIndex,
      date: travel.startDate,
      year: Number(travel.startDate.slice(0, 4)),
      travel,
      focusCode: travel.primaryCountry?.iso2Code ?? travel.countries[0]?.iso2Code ?? null,
      routeArcCount: arcs.length,
    });
  });

  return {
    travels: orderedTravels,
    moments,
    arcs: arcs.slice(-MAX_VISIBLE_ROUTE_ARCS),
  };
}

export function countriesAtMoment(
  countries: VisitedCountry[],
  timeline: GlobeTimeline,
  momentIndex: number,
): VisitedCountry[] {
  if (timeline.travels.length === 0) return [];
  const clampedIndex = Math.max(0, Math.min(momentIndex, timeline.travels.length - 1));
  const visibleTravels = timeline.travels.slice(0, clampedIndex + 1);
  const finalMoment = clampedIndex === timeline.travels.length - 1;

  return countries.flatMap((country) => {
    const matching = visibleTravels.filter((travel) => (
      travel.countries.some((candidate) => candidate.iso2Code === country.iso2Code)
    ));
    if (matching.length === 0) return [];

    const primaryCities = new Set(
      matching.flatMap((travel) => (
        travel.primaryCountry?.iso2Code === country.iso2Code && travel.primaryCity
          ? [travel.primaryCity.id]
          : []
      )),
    );
    const lastVisitedAt = matching.reduce(
      (latest, travel) => travel.endDate > latest ? travel.endDate : latest,
      matching[0].endDate,
    );

    return [{
      ...country,
      travelCount: matching.length,
      cityCount: finalMoment ? country.cityCount : primaryCities.size,
      lastVisitedAt,
    }];
  });
}

export function arcsAtMoment(timeline: GlobeTimeline, momentIndex: number): GlobeRouteArc[] {
  return timeline.arcs.filter((arc) => arc.momentIndex <= momentIndex);
}

function routePointsForTravel(travel: TravelSummary): RoutePoint[] {
  const points: RoutePoint[] = [];
  const primaryCountryCode = travel.primaryCountry?.iso2Code;

  if (travel.primaryCity) {
    points.push({
      lat: travel.primaryCity.latitude,
      lng: travel.primaryCity.longitude,
      label: travel.primaryCity.nameKo || travel.primaryCity.nameEn,
    });
  } else if (travel.primaryCountry) {
    points.push(countryPoint(travel.primaryCountry));
  }

  for (const country of travel.countries) {
    if (country.iso2Code !== primaryCountryCode || points.length === 0) {
      const point = countryPoint(country);
      if (!points.some((candidate) => samePoint(candidate, point))) points.push(point);
    }
  }

  return points;
}

function countryPoint(country: TravelSummary["countries"][number]): RoutePoint {
  return {
    lat: country.latitude,
    lng: country.longitude,
    label: country.nameKo || country.nameEn,
  };
}

function samePoint(left: RoutePoint, right: RoutePoint): boolean {
  return Math.abs(left.lat - right.lat) < 0.01 && Math.abs(left.lng - right.lng) < 0.01;
}
