/**
 * Generates deterministic editorial destination cards for the demo archive.
 *
 * They intentionally look like travel-journal illustrations rather than fake photos:
 * each destination gets its own landmark silhouette, map grid and route rhythm.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/placeholders");

const DESTINATIONS = {
  taipei: ["#d8edf4", "#f6dfc7", "#285c62", "#e8703a"],
  fukuoka: ["#e9e0f1", "#f4dace", "#423b62", "#dc7853"],
  miami: ["#caecea", "#fae3b9", "#176c78", "#ef7450"],
  okinawa: ["#f8e2bc", "#f5c6a7", "#265c67", "#dc6239"],
  korea: ["#ddecda", "#f0e5c7", "#315b47", "#d96539"],
};

const COVER_DESTINATIONS = ["taipei", "fukuoka", "miami", "okinawa", "korea"];
const PHOTO_DESTINATIONS = [
  "taipei", "taipei", "taipei",
  "fukuoka", "fukuoka",
  "miami", "miami", "miami",
  "okinawa", "okinawa",
  "korea", "korea", "korea",
];

function illustration(destination, variation, width, height) {
  const [top, bottom, ink, accent] = DESTINATIONS[destination];
  const grid = Math.max(70, Math.round(width / 12));
  const routeY = Math.round(height * (0.5 + (variation % 3) * 0.055));
  const route = `M ${-width * 0.05} ${routeY} C ${width * 0.2} ${routeY - height * 0.18}, ${width * 0.42} ${routeY + height * 0.13}, ${width * 0.62} ${routeY - height * 0.04} S ${width * 0.9} ${routeY + height * 0.12}, ${width * 1.05} ${routeY - height * 0.08}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="여행 기록 일러스트레이션">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${top}"/>
      <stop offset="100%" stop-color="${bottom}"/>
    </linearGradient>
    <radialGradient id="light" cx="${28 + (variation * 17) % 54}%" cy="${24 + (variation * 11) % 28}%" r="58%">
      <stop offset="0%" stop-color="#fff8dd" stop-opacity="0.86"/>
      <stop offset="100%" stop-color="#fff8dd" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="${grid}" height="${grid}" patternUnits="userSpaceOnUse">
      <path d="M ${grid} 0 L 0 0 0 ${grid}" fill="none" stroke="${ink}" stroke-opacity="0.08" stroke-width="1"/>
    </pattern>
    <filter id="soft"><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <rect width="${width}" height="${height}" fill="url(#light)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <path d="${route}" fill="none" stroke="#ffffff" stroke-opacity="0.72" stroke-width="${height * 0.01}"/>
  <path d="${route}" fill="none" stroke="${accent}" stroke-opacity="0.84" stroke-width="${height * 0.0035}" stroke-dasharray="${height * 0.014} ${height * 0.012}"/>
  ${destinationMotif(destination, variation, width, height, ink, accent)}
  ${routeMarkers(variation, width, height, accent)}
  <path d="M0 ${height * 0.88} Q ${width * 0.35} ${height * 0.78} ${width} ${height * 0.9} V${height} H0Z" fill="${ink}" opacity="0.92"/>
  <path d="M0 ${height * 0.91} Q ${width * 0.52} ${height * 0.81} ${width} ${height * 0.94}" fill="none" stroke="#fff" stroke-opacity="0.16" stroke-width="${height * 0.005}"/>
</svg>`;
}

function routeMarkers(variation, width, height, accent) {
  const points = [
    [0.2 + (variation % 2) * 0.06, 0.48],
    [0.55, 0.56 - (variation % 3) * 0.03],
    [0.81 - (variation % 2) * 0.05, 0.52],
  ];
  return points
    .map(([x, y], index) => `<g transform="translate(${width * x} ${height * y})">
      <circle r="${height * (index === 1 ? 0.023 : 0.017)}" fill="${accent}" fill-opacity="0.16"/>
      <circle r="${height * 0.008}" fill="${accent}" stroke="#fff8ec" stroke-width="${height * 0.004}"/>
    </g>`)
    .join("");
}

function destinationMotif(destination, variation, width, height, ink, accent) {
  if (destination === "taipei") {
    const x = width * (0.63 + (variation % 2) * 0.07);
    return `<g transform="translate(${x} ${height * 0.16})" fill="${ink}" opacity="0.76">
      <path d="M${-width * 0.035} ${height * 0.62} L${-width * 0.022} ${height * 0.2} L0 ${height * 0.13} L${width * 0.022} ${height * 0.2} L${width * 0.035} ${height * 0.62}Z"/>
      <rect x="${-width * 0.055}" y="${height * 0.29}" width="${width * 0.11}" height="${height * 0.035}" rx="4"/>
      <rect x="${-width * 0.048}" y="${height * 0.39}" width="${width * 0.096}" height="${height * 0.032}" rx="4"/>
      <rect x="${-width * 0.042}" y="${height * 0.49}" width="${width * 0.084}" height="${height * 0.03}" rx="4"/>
      <path d="M0 ${height * 0.13}V0" stroke="${accent}" stroke-width="${height * 0.008}"/>
    </g>`;
  }

  if (destination === "fukuoka") {
    return `<g transform="translate(${width * 0.18} ${height * 0.56})" stroke="${ink}" stroke-width="${height * 0.012}" stroke-linejoin="round" opacity="0.78">
      <path d="M0 ${height * 0.18}H${width * 0.36}L${width * 0.3} 0H${width * 0.06}Z" fill="${accent}" fill-opacity="0.55"/>
      <path d="M${width * 0.04} ${height * 0.18}V${height * 0.38}M${width * 0.32} ${height * 0.18}V${height * 0.38}"/>
      <path d="M${width * 0.08} ${height * 0.25}H${width * 0.28}"/>
      <circle cx="${width * 0.1}" cy="${-height * 0.05}" r="${height * 0.035}" fill="${accent}" stroke="none"/>
      <circle cx="${width * 0.18}" cy="${-height * 0.08}" r="${height * 0.028}" fill="${accent}" stroke="none"/>
    </g>`;
  }

  if (destination === "miami") {
    return `<g transform="translate(${width * 0.68} ${height * 0.25})" fill="none" stroke="${ink}" stroke-width="${height * 0.018}" stroke-linecap="round" opacity="0.78">
      <path d="M0 ${height * 0.52}C${-width * 0.02} ${height * 0.32} ${width * 0.015} ${height * 0.18} ${width * 0.04} 0"/>
      <path d="M${width * 0.04} 0C${-width * 0.03} ${height * 0.02} ${-width * 0.07} ${height * 0.09} ${-width * 0.09} ${height * 0.15}M${width * 0.04} 0C${width * 0.11} ${height * 0.01} ${width * 0.15} ${height * 0.07} ${width * 0.17} ${height * 0.13}M${width * 0.04} 0C${width * 0.08} ${-height * 0.07} ${width * 0.08} ${-height * 0.12} ${width * 0.07} ${-height * 0.16}"/>
      <path d="M${-width * 0.21} ${height * 0.56}Q${width * 0.02} ${height * 0.45} ${width * 0.25} ${height * 0.56}" stroke="${accent}" stroke-width="${height * 0.008}"/>
    </g>`;
  }

  if (destination === "okinawa") {
    return `<g transform="translate(${width * 0.57} ${height * 0.36})" fill="none" stroke="${ink}" stroke-width="${height * 0.018}" opacity="0.76">
      <path d="M${-width * 0.18} ${height * 0.05}Q0 ${-height * 0.03} ${width * 0.18} ${height * 0.05}" stroke="${accent}" stroke-width="${height * 0.04}"/>
      <path d="M${-width * 0.13} ${height * 0.08}V${height * 0.38}M${width * 0.13} ${height * 0.08}V${height * 0.38}"/>
      <path d="M${-width * 0.16} ${height * 0.2}H${width * 0.16}"/>
      <path d="M${-width * 0.32} ${height * 0.47}Q${-width * 0.12} ${height * 0.4} ${width * 0.06} ${height * 0.47}T${width * 0.36} ${height * 0.47}" stroke-width="${height * 0.008}"/>
    </g>`;
  }

  return `<g transform="translate(${width * 0.5} ${height * 0.31})" fill="none" stroke="${ink}" opacity="0.78">
    <path d="M${-width * 0.27} ${height * 0.46}L0 ${height * 0.1}L${width * 0.27} ${height * 0.46}" stroke-width="${height * 0.014}"/>
    <path d="M${-width * 0.22} ${height * 0.46}L0 ${height * 0.18}L${width * 0.22} ${height * 0.46}" stroke="${accent}" stroke-width="${height * 0.009}" stroke-dasharray="${height * 0.025} ${height * 0.02}"/>
    <path d="M${-width * 0.3} ${height * 0.5}H${width * 0.3}" stroke-width="${height * 0.03}"/>
    <rect x="${-width * 0.22}" y="${height * 0.32}" width="${width * 0.07}" height="${height * 0.18}" fill="${ink}" stroke="none"/>
    <rect x="${width * 0.13}" y="${height * 0.26}" width="${width * 0.09}" height="${height * 0.24}" fill="${ink}" stroke="none"/>
  </g>`;
}

function avatar() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="프로필 이미지 자리표시자">
  <defs><radialGradient id="a" cx="35%" cy="28%"><stop offset="0%" stop-color="#31596b"/><stop offset="100%" stop-color="#0a1720"/></radialGradient></defs>
  <rect width="200" height="200" fill="url(#a)"/>
  <g fill="none" stroke="#e8703a"><circle cx="100" cy="100" r="31" stroke-opacity="0.62" stroke-width="2"/><ellipse cx="100" cy="100" rx="31" ry="12" stroke-opacity="0.52"/><path d="M69 100h62M100 69v62" stroke-opacity="0.34"/></g>
  <circle cx="121" cy="77" r="5" fill="#ff9a68"/>
</svg>`;
}

await mkdir(OUT_DIR, { recursive: true });

const written = [];
for (let index = 0; index < COVER_DESTINATIONS.length; index += 1) {
  const name = `cover-${String(index + 1).padStart(2, "0")}.svg`;
  await writeFile(resolve(OUT_DIR, name), illustration(COVER_DESTINATIONS[index], index, 1600, 900));
  written.push(name);
}

for (let index = 0; index < PHOTO_DESTINATIONS.length; index += 1) {
  const name = `photo-${String(index + 1).padStart(2, "0")}.svg`;
  await writeFile(resolve(OUT_DIR, name), illustration(PHOTO_DESTINATIONS[index], index + 2, 1200, 900));
  written.push(name);
}

await writeFile(resolve(OUT_DIR, "avatar.svg"), avatar());
written.push("avatar.svg");

console.log(`[placeholders] wrote ${written.length} files to ${OUT_DIR}`);
