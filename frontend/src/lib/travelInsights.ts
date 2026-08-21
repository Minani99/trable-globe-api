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
  featuredTravels: TravelSummary[];
  monthSummaries: TravelMonthSummary[];
  cityHighlights: TravelCityHighlight[];
  topCountry: TravelSummary["countries"][number] | null;
  topCountryVisits: number;
}

export interface TravelMonthSummary {
  month: number;
  travelCount: number;
  travelDays: number;
  countryCount: number;
}

export interface TravelCityHighlight {
  id: number;
  nameKo: string;
  nameEn: string;
  countryNameKo: string | null;
  visitCount: number;
  travelDays: number;
  latestTravelId: number;
}

export interface TravelYearComparison {
  currentYear: number;
  previousYear: number;
  travelCountDelta: number;
  countryCountDelta: number;
  travelDaysDelta: number;
  distanceKmDelta: number;
  newCountries: TravelSummary["countries"];
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
  const monthAccumulators = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    travelCount: 0,
    travelDays: 0,
    countries: new Set<string>(),
  }));
  const cityAccumulators = new Map<number, TravelCityHighlight>();

  for (const travel of ordered) {
    const month = Number(travel.startDate.slice(5, 7));
    const monthAccumulator = monthAccumulators[month - 1];
    if (monthAccumulator) {
      monthAccumulator.travelCount += 1;
      monthAccumulator.travelDays += travel.durationDays;
      travel.countries.forEach((country) => monthAccumulator.countries.add(country.iso2Code));
    }
    if (travel.primaryCity) {
      cities.add(travel.primaryCity.id);
      const existingCity = cityAccumulators.get(travel.primaryCity.id);
      cityAccumulators.set(travel.primaryCity.id, {
        id: travel.primaryCity.id,
        nameKo: travel.primaryCity.nameKo,
        nameEn: travel.primaryCity.nameEn,
        countryNameKo: travel.primaryCountry?.nameKo ?? existingCity?.countryNameKo ?? null,
        visitCount: (existingCity?.visitCount ?? 0) + 1,
        travelDays: (existingCity?.travelDays ?? 0) + travel.durationDays,
        latestTravelId: travel.id,
      });
    }
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
    featuredTravels: [...ordered].reverse().slice(0, 3),
    monthSummaries: monthAccumulators.map(({ countries: monthCountries, ...summary }) => ({
      ...summary,
      countryCount: monthCountries.size,
    })),
    cityHighlights: [...cityAccumulators.values()]
      .sort((left, right) => (
        right.visitCount - left.visitCount
        || right.travelDays - left.travelDays
        || left.nameKo.localeCompare(right.nameKo, "ko")
      ))
      .slice(0, 3),
    topCountry: topCountryEntry ? countries.get(topCountryEntry[0]) ?? null : null,
    topCountryVisits: topCountryEntry?.[1] ?? 0,
  };
}

export function buildTravelYearComparison(
  travels: TravelSummary[],
  currentYear: number | null,
  currentRecap?: TravelRecap,
): TravelYearComparison | null {
  if (currentYear === null) return null;

  const previousYear = travelYears(travels).find((year) => year < currentYear);
  if (previousYear === undefined) return null;

  const currentTravels = travelsForYear(travels, currentYear);
  const previousTravels = travelsForYear(travels, previousYear);
  const resolvedCurrentRecap = currentRecap ?? buildTravelRecap(currentTravels, currentYear);
  const previousRecap = buildTravelRecap(previousTravels, previousYear);
  const previousCountryCodes = new Set(
    previousTravels.flatMap((travel) => travel.countries.map((country) => country.iso2Code)),
  );
  const currentCountries = new Map<string, TravelSummary["countries"][number]>();
  currentTravels.forEach((travel) => {
    travel.countries.forEach((country) => currentCountries.set(country.iso2Code, country));
  });

  return {
    currentYear,
    previousYear,
    travelCountDelta: resolvedCurrentRecap.travelCount - previousRecap.travelCount,
    countryCountDelta: resolvedCurrentRecap.countryCount - previousRecap.countryCount,
    travelDaysDelta: resolvedCurrentRecap.travelDays - previousRecap.travelDays,
    distanceKmDelta: resolvedCurrentRecap.distanceKm - previousRecap.distanceKm,
    newCountries: [...currentCountries.values()]
      .filter((country) => !previousCountryCodes.has(country.iso2Code))
      .sort((left, right) => left.nameKo.localeCompare(right.nameKo, "ko")),
  };
}
