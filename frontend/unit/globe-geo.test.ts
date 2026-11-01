import { expect, test } from "@playwright/test";
import { getCachedCountryFeatures, loadCountryFeatures } from "../src/lib/globe-geo";

test("slow or malformed geography can retry without poisoning the shared cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalTimeout = AbortSignal.timeout;
  try {
    AbortSignal.timeout = () => originalTimeout(10);
    globalThis.fetch = async (_input, init) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), { once: true });
    });
    await expect(loadCountryFeatures()).rejects.toMatchObject({ name: "TimeoutError" });
    expect(getCachedCountryFeatures()).toEqual([]);
    AbortSignal.timeout = originalTimeout;
    for (const body of [null, {}, { features: [] }, { features: [{}] }]) {
      globalThis.fetch = async () => Response.json(body);
      await expect(loadCountryFeatures()).rejects.toThrow("Invalid country geography");
      expect(getCachedCountryFeatures()).toEqual([]);
    }
    const feature = { type: "Feature", id: "JPN", properties: { iso2: "JP", iso3: "JPN", nameEn: "Japan", nameKo: "일본" }, geometry: { type: "Polygon", coordinates: [[[130, 30], [140, 30], [140, 40], [130, 30]]] } };
    let requests = 0;
    globalThis.fetch = async () => { requests += 1; return Response.json({ features: [feature] }); };
    const [first, second] = await Promise.all([loadCountryFeatures(), loadCountryFeatures()]);
    expect(first).toEqual([feature]);
    expect(first).toBe(second);
    expect(await loadCountryFeatures()).toBe(first);
    expect(getCachedCountryFeatures()).toBe(first);
    expect(requests).toBe(1);
  } finally {
    globalThis.fetch = originalFetch;
    AbortSignal.timeout = originalTimeout;
  }
});
