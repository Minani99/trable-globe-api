/**
 * Generates public/geo/countries.geo.json - the country outlines the globe draws.
 *
 * Two offline datasets are joined so the app never calls a map tile service at runtime:
 *   - world-atlas   : Natural Earth 110m country geometry, keyed by ISO 3166-1 numeric
 *   - world-countries: ISO numeric -> alpha-2 / alpha-3 plus Korean country names
 *
 * The output is committed, so a normal `npm install && npm run build` needs neither this
 * script nor its devDependencies. Re-run it with `npm run geo:build` to refresh the data.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { feature } from "topojson-client";

const require = createRequire(import.meta.url);
const topology = require("world-atlas/countries-110m.json");
const countries = require("world-countries");

const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../public/geo/countries.geo.json");

/** ISO 3166-1 numeric (zero padded, as world-atlas uses) -> reference data. */
const byNumeric = new Map(
  countries.map((country) => [
    String(country.ccn3).padStart(3, "0"),
    {
      iso2: country.cca2,
      iso3: country.cca3,
      nameEn: country.name.common,
      nameKo: country.translations?.kor?.common ?? country.name.common,
    },
  ]),
);

const collection = feature(topology, topology.objects.countries);

const features = collection.features
  // Antarctica dominates an orthographic projection and no one records a trip there yet.
  .filter((entry) => entry.id !== "010")
  .map((entry) => {
    const reference = byNumeric.get(String(entry.id).padStart(3, "0"));
    return {
      type: "Feature",
      // Keeping the numeric id makes an unmatched feature debuggable.
      id: entry.id,
      properties: {
        iso2: reference?.iso2 ?? null,
        iso3: reference?.iso3 ?? null,
        nameEn: reference?.nameEn ?? entry.properties?.name ?? "Unknown",
        nameKo: reference?.nameKo ?? entry.properties?.name ?? "Unknown",
      },
      geometry: entry.geometry,
    };
  });

const unmatched = features.filter((entry) => entry.properties.iso2 === null);
if (unmatched.length > 0) {
  console.warn(
    `[geo] ${unmatched.length} feature(s) without an ISO alpha-2 code:`,
    unmatched.map((entry) => `${entry.id}/${entry.properties.nameEn}`).join(", "),
  );
}

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, JSON.stringify({ type: "FeatureCollection", features }));

console.log(`[geo] wrote ${features.length} countries to ${OUTPUT}`);
