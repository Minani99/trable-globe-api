import { mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import countries from "world-countries";

const require = createRequire(import.meta.url);
const source = path.dirname(require.resolve("world-countries/package.json"));
const output = fileURLToPath(new URL("../public/plan-flags/", import.meta.url));
await mkdir(output, { recursive: true });
for (const country of countries) {
  const svg = path.join(source, "data", `${country.cca3.toLowerCase()}.svg`);
  await sharp(svg).resize({ width: 144, height: 108, fit: "inside" })
    .webp({ quality: 90 }).toFile(path.join(output, `${country.cca2.toLowerCase()}.webp`));
}
