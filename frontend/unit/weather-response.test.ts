import { expect, test } from "@playwright/test";
import { fetchTripWeather } from "../src/lib/weather";

test("invalid weather is rejected without poisoning the shared cache", async () => {
  const originalFetch = globalThis.fetch;
  const query = { latitude: 35.12, longitude: 135.12, startDate: "2027-04-10", endDate: "2027-04-10" };
  const day = { date: query.startDate, weatherCode: 0, source: "forecast", temperatureMax: 24 };
  let calls = 0;
  try {
    for (const data of [null, {}, { available: true, days: {} }, { available: true, days: [null] },
      { available: true, days: [{ ...day, date: null }] },
      { available: true, days: [{ ...day, temperatureMax: "24" }] },
      { available: true, days: [{ ...day, source: "unknown" }] }]) {
      globalThis.fetch = async () => { calls += 1; return Response.json({ success: true, data }); };
      await expect(fetchTripWeather(query)).rejects.toThrow();
    }
    expect(calls).toBe(7);
    globalThis.fetch = async () => { calls += 1; return Response.json({ success: true, data: { available: true, days: [day] } }); };
    const [first, second] = await Promise.all([fetchTripWeather(query), fetchTripWeather(query)]);
    expect(calls).toBe(8);
    expect(first).toBe(second);
    expect(first.days[0].temperatureMin).toBeNull();
    expect(first.availableFrom).toBeNull();
    expect(await fetchTripWeather(query)).toBe(first);
    expect(calls).toBe(8);
  } finally { globalThis.fetch = originalFetch; }
});
