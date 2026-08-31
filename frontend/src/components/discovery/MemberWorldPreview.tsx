import type { MemberDiscoveryCountry } from "@/types";

const WORLD_OUTLINE =
  "M27 57c10-20 31-34 55-31l16 11 20-5 18 13-12 9-4 20-18 7-12 21-25-1-8-18-14-9-14-19Zm116-25 21-11 30 4 16 12 31 4 21 16-5 13-22 7-8 17-20 2-15-15-18-1-11-15 3-14Zm75 69 22-5 22 9 12 19-10 13-26-2-18-15Z";

export function MemberWorldPreview({
  countries,
  displayName,
  id,
}: {
  countries: MemberDiscoveryCountry[];
  displayName: string;
  id: string;
}) {
  const points = countries.slice(0, 10).map((country) => ({
    ...country,
    x: ((country.longitude + 180) / 360) * 300,
    y: ((90 - country.latitude) / 180) * 150,
  }));
  const route = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");
  const gradientId = `world-${safeId(id)}`;

  return (
    <svg
      className="member-world-preview"
      viewBox="0 0 300 150"
      role="img"
      aria-label={`${displayName}님의 방문 국가 ${points.length}곳 미리보기`}
    >
      <title>{`${displayName}님의 여행 세계`}</title>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--globe-ocean)" stopOpacity="0.28" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0.11" />
        </linearGradient>
      </defs>
      <rect width="300" height="150" rx="18" fill={`url(#${gradientId})`} />
      <path className="member-world-preview__grid" d="M0 50h300M0 100h300M75 0v150M150 0v150M225 0v150" />
      <path className="member-world-preview__land" d={WORLD_OUTLINE} />
      {points.length > 1 ? <polyline className="member-world-preview__route" points={route} /> : null}
      {points.map((point, index) => (
        <g key={point.iso2Code}>
          <circle className="member-world-preview__halo" cx={point.x} cy={point.y} r={index === 0 ? 7 : 5.5} />
          <circle className="member-world-preview__point" cx={point.x} cy={point.y} r={index === 0 ? 3.2 : 2.6} />
        </g>
      ))}
      {points.length === 0 ? <text x="150" y="80">FIRST JOURNEY</text> : null}
    </svg>
  );
}

function safeId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-") || "traveler";
}
