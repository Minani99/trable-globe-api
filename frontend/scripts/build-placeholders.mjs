/**
 * Generates public/placeholders/*.svg - the stand-in imagery the seeded travels point at.
 *
 * The MVP has no upload pipeline, and depending on a random-image service would make the
 * UI flicker differently on every load (and break offline). These are deterministic,
 * self-contained SVGs: soft editorial landscapes that read as destination postcards at
 * card size without pretending to be real photos.
 *
 * Regenerate with `npm run placeholders:build`. The output is committed.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/placeholders");

/** [sky top, sky bottom, glow, far ridge, near ridge, foreground] */
const PALETTES = [
  ["#d8edf7", "#f6dfcc", "#fff5cf", "#88a8a3", "#587b79", "#294f55"],
  ["#e8dff3", "#f8e0df", "#fff0d7", "#9b8fa9", "#6b637d", "#37364f"],
  ["#ccebee", "#e9f4e9", "#fff8cf", "#71a8a7", "#437b7c", "#24515b"],
  ["#f7dfbe", "#f6c9a9", "#fff0c6", "#be8b68", "#8d6048", "#573b32"],
  ["#dceedd", "#f2e8cd", "#fff8d9", "#85a681", "#587b5e", "#34523e"],
  ["#d9e2f5", "#e8dcf3", "#fff3d1", "#8993bb", "#5d678f", "#343c68"],
  ["#f5dbe4", "#f6e2d0", "#fff1d0", "#bd8498", "#8a5b73", "#57394f"],
  ["#d2eeeb", "#e3f3df", "#fff7cf", "#74a5a0", "#477a75", "#285651"],
  ["#f3e5c7", "#efd8b6", "#fff4c9", "#b49a70", "#806d50", "#504430"],
  ["#d7e5f7", "#e7edf7", "#fff6d5", "#7899bd", "#4e7195", "#2e4d70"],
];

/**
 * Builds one horizon scene.
 *
 * @param {number} index selects the palette and shifts the composition
 * @param {number} width
 * @param {number} height
 */
function scene(index, width, height) {
  const [skyTop, skyBottom, glow, farRidge, nearRidge, foreground] =
    PALETTES[index % PALETTES.length];

  const horizon = height * 0.62;
  const glowX = 22 + ((index * 13) % 56);
  const glowY = 25 + ((index * 7) % 24);

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
    <radialGradient id="glow" cx="${glowX}%" cy="${glowY}%" r="68%">
      <stop offset="0%" stop-color="${glow}" stop-opacity="0.82"/>
      <stop offset="55%" stop-color="${glow}" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="${glow}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect y="${(horizon - height * 0.18).toFixed(1)}" width="${width}" height="${(height * 0.18).toFixed(1)}" fill="url(#haze)"/>

  <path d="M0 ${(horizon - height * 0.08).toFixed(1)} C ${(width * 0.22).toFixed(1)} ${(horizon - height * 0.13).toFixed(1)}, ${(width * 0.64).toFixed(1)} ${(horizon + height * 0.01).toFixed(1)}, ${width} ${(horizon - height * 0.12).toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="0.48" stroke-width="${(height * 0.008).toFixed(1)}"/>
  <polygon points="${ridge(horizon, height * 0.045, index * 0.7)}" fill="${farRidge}" opacity="0.82"/>
  <polygon points="${ridge(horizon + height * 0.11, height * 0.035, index * 1.3 + 2)}" fill="${nearRidge}"/>
  <polygon points="${ridge(horizon + height * 0.26, height * 0.02, index * 0.9 + 4)}" fill="${foreground}"/>
  <path d="M0 ${(height * 0.86).toFixed(1)} Q ${(width * 0.38).toFixed(1)} ${(height * 0.76).toFixed(1)} ${width} ${(height * 0.9).toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="0.16" stroke-width="${(height * 0.006).toFixed(1)}"/>
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
