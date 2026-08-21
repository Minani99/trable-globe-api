import { distanceForTravelsKm } from "@/lib/globeTimeline";
import type { TravelSummary } from "@/types";

export interface TravelRecap {
  year: number | null;
  travelCount: number;
  countryCount: number;
  cityCount: number;
  travelDays: number;
  distanceKm: number;
  photoCount: number;
  firstTravel: TravelSummary | null;
  latestTravel: TravelSummary | null;
  longestTravel: TravelSummary | null;
  topCountry: TravelSummary["countries"][number] | null;
  topCountryVisits: number;
}

export function travelYears(travels: TravelSummary[]): number[] {
  return [...new Set(travels.map((travel) => Number(travel.startDate.slice(0, 4))))]
    .filter(Number.isFinite)
    .sort((left, right) => right - left);
}

export function travelsForYear(travels: TravelSummary[], year: number | null): TravelSummary[] {
  if (year === null) return travels;
  return travels.filter((travel) => Number(travel.startDate.slice(0, 4)) === year);
}

export function buildTravelRecap(travels: TravelSummary[], year: number | null): TravelRecap {
  const ordered = [...travels].sort((left, right) => (
    left.startDate.localeCompare(right.startDate) || left.id - right.id
  ));
  const countries = new Map<string, TravelSummary["countries"][number]>();
  const countryVisits = new Map<string, number>();
  const cities = new Set<number>();

  for (const travel of ordered) {
    if (travel.primaryCity) cities.add(travel.primaryCity.id);
    for (const country of travel.countries) {
      countries.set(country.iso2Code, country);
      countryVisits.set(country.iso2Code, (countryVisits.get(country.iso2Code) ?? 0) + 1);
    }
  }

  const topCountryEntry = [...countryVisits.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  ))[0] ?? null;
  const longestTravel = ordered.reduce<TravelSummary | null>((longest, travel) => {
    if (!longest || travel.durationDays > longest.durationDays) return travel;
    return longest;
  }, null);
  const distanceKm = distanceForTravelsKm(ordered);

  return {
    year,
    travelCount: ordered.length,
    countryCount: countries.size,
    cityCount: cities.size,
    travelDays: ordered.reduce((total, travel) => total + travel.durationDays, 0),
    distanceKm: Math.round(distanceKm),
    photoCount: ordered.reduce((total, travel) => total + travel.photoCount, 0),
    firstTravel: ordered[0] ?? null,
    latestTravel: ordered.at(-1) ?? null,
    longestTravel,
    topCountry: topCountryEntry ? countries.get(topCountryEntry[0]) ?? null : null,
    topCountryVisits: topCountryEntry?.[1] ?? 0,
  };
}
