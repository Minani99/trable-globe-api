import "server-only";

import generatedAirports from "@/data/airports.generated.json";
import {
  AIRPORT_OPTIONS,
  searchAirportOptions,
  type AirportOption,
} from "@/lib/airports";

const curatedCodes = new Set(AIRPORT_OPTIONS.map((airport) => airport.code));

const catalog: AirportOption[] = [
  ...AIRPORT_OPTIONS,
  ...generatedAirports
    .filter((airport) => !curatedCodes.has(airport.code))
    .map((airport) => ({
      code: airport.code,
      cityKo: airport.cityEn,
      cityEn: airport.cityEn,
      airportKo: airport.airportName,
      countryKo: airport.countryKo,
      countryCode: airport.countryCode,
    })),
];

export function searchAirportCatalog(query: string, limit = 8): AirportOption[] {
  return searchAirportOptions(catalog, query, limit);
}
