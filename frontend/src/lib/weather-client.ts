export type ForecastDay = { date: string; weatherCode: number | null; temperatureMin: number | null; temperatureMax: number | null; precipitationProbability: number | null };
export type Forecast = { available: boolean; availableFrom: string | null; days: ForecastDay[] };
// Public forecasts only. Bounded, short-lived requests are shared across mounted views.
const requests = new Map<string, { expires: number; promise: Promise<Forecast> }>();
export function forecastRequest(url: string) {
  const cached = requests.get(url);
  if (cached && cached.expires > Date.now()) return cached.promise;
  const promise = fetch(url, { signal: AbortSignal.timeout(12_000) }).then(async (response) => {
    const body = await response.json();
    if (!response.ok || !body.success || !body.data) throw new Error("forecast unavailable");
    return body.data as Forecast;
  }).catch((error) => { requests.delete(url); throw error; });
  if (requests.size >= 24) requests.delete(requests.keys().next().value!);
  requests.set(url, { expires: Date.now() + 5 * 60_000, promise });
  return promise;
}

export function clearForecast(url: string) { requests.delete(url); }
