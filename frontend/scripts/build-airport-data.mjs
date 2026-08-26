/**
 * Builds the compact airport catalog used by the flight-search combobox.
 *
 * Source: OurAirports (public domain), refreshed from its daily CSV export.
 * Only airports with an IATA code and scheduled passenger service are kept.
 * The generated JSON is committed, so production does not depend on this feed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SOURCE = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const OUTPUT = resolve(dirname(fileURLToPath(import.meta.url)), "../src/data/airports.generated.json");
const require = createRequire(import.meta.url);
const countries = require("world-countries");

const countryNames = new Map(countries.map((country) => [
  country.cca2,
  country.translations?.kor?.common ?? country.name.common,
]));

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`[airports] download failed: ${response.status}`);

const rows = parseCsv(await response.text());
const header = rows.shift();
if (!header) throw new Error("[airports] CSV header is missing");
const column = new Map(header.map((name, index) => [name, index]));
const value = (row, name) => row[column.get(name)]?.trim() ?? "";
const typeRank = { large_airport: 0, medium_airport: 1, small_airport: 2 };

const catalog = rows
  .filter((row) => value(row, "scheduled_service") === "yes")
  .map((row) => ({
    code: value(row, "iata_code").toUpperCase(),
    cityEn: value(row, "municipality"),
    airportName: value(row, "name"),
    countryCode: value(row, "iso_country").toUpperCase(),
    countryKo: countryNames.get(value(row, "iso_country").toUpperCase()) ?? value(row, "iso_country").toUpperCase(),
    type: value(row, "type"),
  }))
  .filter((airport) => /^[A-Z]{3}$/.test(airport.code) && airport.cityEn && airport.airportName)
  .sort((a, b) => (typeRank[a.type] ?? 9) - (typeRank[b.type] ?? 9) || a.airportName.localeCompare(b.airportName, "en"));

const unique = [...new Map(catalog.map((airport) => [airport.code, airport])).values()]
  .map((airport) => ({
    code: airport.code,
    cityEn: airport.cityEn,
    airportName: airport.airportName,
    countryCode: airport.countryCode,
    countryKo: airport.countryKo,
  }))
  .sort((a, b) => a.countryKo.localeCompare(b.countryKo, "ko") || a.cityEn.localeCompare(b.cityEn, "en"));

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(unique)}\n`);
console.log(`[airports] wrote ${unique.length} scheduled-service airports to ${OUTPUT}`);

function parseCsv(source) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
