export interface CountryFeature {
  type: "Feature";
  id: string;
  properties: { iso2: string | null; iso3: string | null; nameEn: string; nameKo: string };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

const EMPTY_FEATURES: CountryFeature[] = [];
let cachedFeatures = EMPTY_FEATURES;
let request: Promise<CountryFeature[]> | null = null;

export function getCachedCountryFeatures(): CountryFeature[] {
  return cachedFeatures;
}

/** Static geography is shared across globe mounts; failed requests can retry. */
export function loadCountryFeatures(): Promise<CountryFeature[]> {
  request ??= fetch("/geo/countries.geo.json")
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const collection = await response.json() as { features: CountryFeature[] };
      cachedFeatures = collection.features;
      return cachedFeatures;
    })
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}
