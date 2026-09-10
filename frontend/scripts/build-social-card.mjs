import { fileURLToPath } from "node:url";

import sharp from "sharp";

const appDirectory = fileURLToPath(new URL("../src/app/", import.meta.url));
const outputPaths = ["opengraph-image.png", "twitter-image.png"]
  .map((name) => `${appDirectory}${name}`);

const socialCard = String.raw`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbfcf9"/>
      <stop offset="1" stop-color="#eef4f2"/>
    </linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="20" stdDeviation="24" flood-color="#17333d" flood-opacity="0.14"/>
    </filter>
  </defs>

  <rect width="1200" height="630" fill="url(#background)"/>
  <path d="M0 500 C210 440 330 555 520 490 S840 410 1200 472" fill="none" stroke="#d7e3e2" stroke-width="2"/>
  <path d="M0 535 C180 475 335 590 530 520 S855 445 1200 505" fill="none" stroke="#e4ecea" stroke-width="1"/>

  <g transform="translate(72 58)">
    <rect width="46" height="46" rx="13" fill="#f6f7f4"/>
    <circle cx="23" cy="23" r="18" fill="#8fd0e5" stroke="#39778c" stroke-width="1.4"/>
    <path d="M13.3 14.9c2.9-3.5 7.3-5.4 11.8-5.1 2.7.1 4.2.9 5.5 2.2 1.1 1.1 1 2.3-.5 2.9L27 16c-1.4.5-2 1.9-1.5 3.2l.8 1.9c.6 1.2-.2 2.7-1.5 3l-2.5.6c-1.4.4-2.8-.6-3-2l-.4-2.7c-.2-1.4-1.5-2.3-2.9-2.1l-.8.1c-1.9.3-2.9-1.6-1.9-3.1Z" fill="#e5e9d8"/>
    <path d="M6.5 29.3c5.8 4.2 13.6 3.9 19.2-.4 3.4-2.6 5.9-6.1 7.8-10.6" fill="none" stroke="#e85f2b" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="6.5" cy="29.3" r="1.9" fill="#fff" stroke="#e85f2b" stroke-width="1.5"/>
    <circle cx="33.6" cy="18.2" r="3.5" fill="#f6f7f4" stroke="#e85f2b" stroke-width="1.6"/>
    <circle cx="33.6" cy="18.2" r="1.4" fill="#e85f2b"/>
  </g>
  <text x="136" y="90" fill="#17303a" font-family="Arial, 'Malgun Gothic', sans-serif" font-size="19" font-weight="700" letter-spacing="5">TRAVEL GLOBE</text>
  <text x="72" y="205" fill="#142b34" font-family="Arial, 'Malgun Gothic', sans-serif" font-size="64" font-weight="700" letter-spacing="-3">
    <tspan x="72" dy="0">여행을 계획하고,</tspan>
    <tspan x="72" dy="82">지구본에 기록하세요.</tspan>
  </text>
  <text x="75" y="405" fill="#6d8087" font-family="Arial, 'Malgun Gothic', sans-serif" font-size="24" font-weight="400">일정 · 지도 · 여행 기록을 한곳에서</text>

  <g transform="translate(72 475)" font-family="Arial, 'Malgun Gothic', sans-serif" font-size="16" font-weight="700">
    <rect width="102" height="43" rx="21.5" fill="#ffffff" stroke="#cbd8d8"/>
    <text x="51" y="28" text-anchor="middle" fill="#526970">PLAN</text>
    <path d="M116 21.5h25" stroke="#c0d0d0" stroke-width="2" stroke-linecap="round"/>
    <rect x="154" width="82" height="43" rx="21.5" fill="#fff0e8" stroke="#efb197"/>
    <text x="195" y="28" text-anchor="middle" fill="#d95527">GO</text>
    <path d="M250 21.5h25" stroke="#c0d0d0" stroke-width="2" stroke-linecap="round"/>
    <rect x="288" width="142" height="43" rx="21.5" fill="#ffffff" stroke="#cbd8d8"/>
    <text x="359" y="28" text-anchor="middle" fill="#526970">REMEMBER</text>
  </g>

  <g transform="translate(756 88) scale(6.7)" filter="url(#shadow)">
    <rect width="64" height="64" rx="16" fill="#f6f7f4"/>
    <circle cx="32" cy="32" r="25" fill="#8fd0e5" stroke="#39778c" stroke-width="1.5"/>
    <path d="M18.5 20.7c4-4.8 10-7.4 16.2-7 3.7.2 5.8 1.3 7.6 3.1 1.4 1.5 1.3 3.2-.7 4l-4.3 1.5c-1.9.7-2.8 2.7-2 4.4l1.1 2.6c.7 1.7-.3 3.7-2.1 4.1l-3.4.8c-2 .5-3.9-.8-4.2-2.8l-.6-3.8c-.3-1.9-2-3.2-4-2.9l-1.1.2c-2.6.3-4-2.2-2.3-4.2Z" fill="#e5e9d8"/>
    <ellipse cx="32" cy="32" rx="11.5" ry="25" fill="none" stroke="#ddf3f8" stroke-opacity=".62"/>
    <path d="M9.3 40.8c8 5.7 18.7 5.3 26.4-.6 4.7-3.6 8.1-8.4 10.7-14.6" fill="none" stroke="#e85f2b" stroke-width="3" stroke-linecap="round"/>
    <circle cx="9.3" cy="40.8" r="2.5" fill="#fff" stroke="#e85f2b" stroke-width="2"/>
    <circle cx="46.5" cy="25.5" r="4.8" fill="#f6f7f4" stroke="#e85f2b" stroke-width="2"/>
    <circle cx="46.5" cy="25.5" r="2" fill="#e85f2b"/>
  </g>
</svg>`;

await Promise.all(outputPaths.map((outputPath) => (
  sharp(Buffer.from(socialCard))
    .png({ compressionLevel: 9, quality: 100 })
    .toFile(outputPath)
)));

console.log(`Built ${outputPaths.length} social cards (1200x630).`);
