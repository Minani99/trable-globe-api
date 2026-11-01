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
  request ??= fetch("/geo/countries.geo.json", { signal: AbortSignal.timeout(20_000) })
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const collection: unknown = await response.json();
      if (!collection || typeof collection !== "object" || !("features" in collection)
        || !Array.isArray(collection.features) || collection.features.length === 0
        || !collection.features.every(isCountryFeature)) {
        throw new Error("Invalid country geography");
      }
      cachedFeatures = collection.features;
      return cachedFeatures;
    })
    .catch((error: unknown) => {
      request = null;
      throw error;
    });
  return request;
}

function isCountryFeature(value: unknown): value is CountryFeature {
  if (!value || typeof value !== "object") return false;
  const feature = value as Partial<CountryFeature>;
  return feature.type === "Feature"
    && typeof feature.id === "string"
    && typeof feature.properties?.nameEn === "string"
    && typeof feature.properties?.nameKo === "string"
    && (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
    && Array.isArray(feature.geometry.coordinates)
    && feature.geometry.coordinates.length > 0;
}
