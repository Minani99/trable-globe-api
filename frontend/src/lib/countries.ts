import countries from "world-countries";

import type { CountryWriteInput } from "@/types";

export interface CountryOption extends CountryWriteInput {
  label: string;
}

/** Launch-ready ISO catalog; city/place coordinates remain user-owned travel data. */
export const countryOptions: CountryOption[] = countries
  .filter((country) => country.cca2 && country.cca3 && country.latlng?.length === 2)
  .map((country) => {
    const nameKo = country.translations?.kor?.common ?? country.name.common;
    return {
      iso2Code: country.cca2,
      iso3Code: country.cca3,
      nameEn: country.name.common,
      nameKo,
      latitude: country.latlng[0],
      longitude: country.latlng[1],
      label: `${nameKo} · ${country.name.common}`,
    };
  })
  .sort((a, b) => a.nameKo.localeCompare(b.nameKo, "ko"));

export const countryByIso2 = new Map(countryOptions.map((country) => [country.iso2Code, country]));
