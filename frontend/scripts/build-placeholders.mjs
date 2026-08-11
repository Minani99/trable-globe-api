/**
 * Generates public/placeholders/*.svg - the stand-in imagery the seeded travels point at.
 *
 * The MVP has no upload pipeline, and depending on a random-image service would make the
 * UI flicker differently on every load (and break offline). These are deterministic,
 * self-contained SVGs: abstract horizons that read as travel photography at card size
 * without pretending to be a real photo.
 *
 * Regenerate with `npm run placeholders:build`. The output is committed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/placeholders");

/** [sky top, sky bottom, sun, far ridge, near ridge, foreground] */
const PALETTES = [
  ["#0a1626", "#1d3a52", "#e8703a", "#16283a", "#0f1c2a", "#080f18"],
  ["#140f22", "#3a2145", "#e0567f", "#241732", "#180e22", "#0d0714"],
  ["#061a20", "#0f4152", "#4fd1c5", "#0a2f3c", "#07202a", "#04141b"],
  ["#1a1005", "#4a2a10", "#f0a63c", "#301c0c", "#1f1208", "#130a04"],
  ["#0a1410", "#17402f", "#7fd6a2", "#102b20", "#0a1c15", "#05100c"],
  ["#12101f", "#2b2a52", "#8f9bff", "#1c1b38", "#131226", "#0a0917"],
  ["#200c16", "#4f1b32", "#ff7a9c", "#33101f", "#210a14", "#12060b"],
  ["#081a1a", "#134040", "#5ecfcf", "#0d2c2c", "#081d1d", "#041111"],
  ["#1c1408", "#4d3413", "#ffc861", "#332211", "#20150a", "#120c05"],
  ["#0d1220", "#243456", "#6ea8ff", "#18223a", "#101728", "#080c15"],
];

/**
 * Builds one horizon scene.
 *
 * @param {number} index selects the palette and shifts the composition
 * @param {number} width
 * @param {number} height
 */
function scene(index, width, height) {
  const [skyTop, skyBottom, sun, farRidge, nearRidge, foreground] =
    PALETTES[index % PALETTES.length];

  const horizon = height * 0.62;
  const sunX = width * (0.22 + ((index * 0.13) % 0.56));
  const sunY = horizon - height * (0.14 + ((index * 0.05) % 0.18));
  const sunR = height * 0.085;

  // Two ridge lines, offset per index so no two placeholders share a silhouette.
  const ridge = (baseY, amplitude, phase) => {
    const points = [];
    for (let x = 0; x <= width; x += width / 12) {
      const y = baseY + Math.sin(x / (width / 6) + phase) * amplitude;
      points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return `${points.join(" ")} ${width},${height} 0,${height}`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="여행 사진 자리표시자">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${skyTop}"/>
      <stop offset="100%" stop-color="${skyBottom}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${sun}" stop-opacity="0.85"/>
      <stop offset="60%" stop-color="${sun}" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="${sun}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sun}" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="${sun}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${(sunR * 4).toFixed(1)}" fill="url(#glow)"/>
  <circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="${sunR.toFixed(1)}" fill="${sun}" opacity="0.92"/>
  <rect y="${(horizon - height * 0.18).toFixed(1)}" width="${width}" height="${(height * 0.18).toFixed(1)}" fill="url(#haze)"/>

  <polygon points="${ridge(horizon, height * 0.045, index * 0.7)}" fill="${farRidge}" opacity="0.95"/>
  <polygon points="${ridge(horizon + height * 0.11, height * 0.035, index * 1.3 + 2)}" fill="${nearRidge}"/>
  <polygon points="${ridge(horizon + height * 0.26, height * 0.02, index * 0.9 + 4)}" fill="${foreground}"/>
</svg>
`;
}

/** Neutral avatar: concentric rings, no face, no initials. */
function avatar() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="프로필 이미지 자리표시자">
  <defs>
    <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16283a"/>
      <stop offset="100%" stop-color="#0a1220"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#a)"/>
  <g fill="none" stroke="#e8703a" stroke-opacity="0.5">
    <circle cx="100" cy="100" r="26" stroke-width="1.5"/>
    <circle cx="100" cy="100" r="46" stroke-width="1" stroke-opacity="0.32"/>
    <circle cx="100" cy="100" r="66" stroke-width="1" stroke-opacity="0.16"/>
  </g>
  <ellipse cx="100" cy="100" rx="26" ry="10" fill="none" stroke="#e8703a" stroke-opacity="0.55" stroke-width="1.5"/>
  <line x1="74" y1="100" x2="126" y2="100" stroke="#e8703a" stroke-opacity="0.55" stroke-width="1.5"/>
</svg>
`;
}

await mkdir(OUT_DIR, { recursive: true });

const written = [];

for (let i = 1; i <= 5; i += 1) {
  const name = `cover-0${i}.svg`;
  await writeFile(resolve(OUT_DIR, name), scene(i - 1, 1600, 900));
  written.push(name);
}

for (let i = 1; i <= 10; i += 1) {
  const name = `photo-${String(i).padStart(2, "0")}.svg`;
  await writeFile(resolve(OUT_DIR, name), scene(i + 2, 1200, 900));
  written.push(name);
}

await writeFile(resolve(OUT_DIR, "avatar.svg"), avatar());
written.push("avatar.svg");

console.log(`[placeholders] wrote ${written.length} files to ${OUT_DIR}`);
