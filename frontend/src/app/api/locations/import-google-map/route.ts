import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GOOGLE_MAP_HOSTS = new Set([
  "google.com",
  "www.google.com",
  "maps.google.com",
  "maps.app.goo.gl",
  "goo.gl",
]);

export async function POST(request: NextRequest) {
  let rawUrl = "";
  try {
    const body = await request.json() as { url?: unknown };
    rawUrl = typeof body.url === "string" ? body.url.trim() : "";
  } catch {
    // The common error response below is more useful than leaking parser details.
  }

  const initialUrl = safeGoogleMapsUrl(rawUrl);
  if (!initialUrl) {
    return NextResponse.json(
      { success: false, data: null, message: "Google 지도에서 복사한 장소 링크를 확인해 주세요." },
      { status: 400 },
    );
  }

  try {
    const resolvedUrl = isShortGoogleUrl(initialUrl)
      ? await followGoogleRedirect(initialUrl)
      : initialUrl;
    const parsed = parseGoogleMapsUrl(resolvedUrl);
    if (!parsed.name && (parsed.latitude === null || parsed.longitude === null)) {
      throw new Error("place data missing");
    }
    return NextResponse.json(
      { success: true, data: { ...parsed, sourceUrl: resolvedUrl.toString() }, message: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "장소 정보를 읽지 못했습니다. Google 지도에서 ‘공유 → 링크 복사’를 다시 선택해 주세요." },
      { status: 422 },
    );
  }
}

function safeGoogleMapsUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !GOOGLE_MAP_HOSTS.has(url.hostname.toLowerCase())) return null;
    return url;
  } catch {
    return null;
  }
}

function isShortGoogleUrl(url: URL): boolean {
  return url.hostname === "maps.app.goo.gl" || url.hostname === "goo.gl";
}

async function followGoogleRedirect(url: URL): Promise<URL> {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "TravelGlobe/0.1 (https://travel-globe-minani99.vercel.app/about)" },
    cache: "no-store",
    signal: AbortSignal.timeout(7_000),
  });
  const resolved = safeGoogleMapsUrl(response.url);
  if (!resolved) throw new Error("unsafe redirect");
  return resolved;
}

function parseGoogleMapsUrl(url: URL): { name: string | null; latitude: number | null; longitude: number | null } {
  const decoded = safeDecode(url.toString());
  const pathName = safeDecode(url.pathname);
  const coordinatePatterns = [
    /@(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)/,
    /!3d(-?\d{1,2}(?:\.\d+)?)[^!]*!4d(-?\d{1,3}(?:\.\d+)?)/,
  ];
  let latitude: number | null = null;
  let longitude: number | null = null;
  for (const pattern of coordinatePatterns) {
    const match = decoded.match(pattern);
    if (!match) continue;
    latitude = boundedCoordinate(match[1], -90, 90);
    longitude = boundedCoordinate(match[2], -180, 180);
    if (latitude !== null && longitude !== null) break;
  }

  const query = url.searchParams.get("query") || url.searchParams.get("q");
  if ((latitude === null || longitude === null) && query) {
    const coordinateQuery = query.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
    if (coordinateQuery) {
      latitude = boundedCoordinate(coordinateQuery[1], -90, 90);
      longitude = boundedCoordinate(coordinateQuery[2], -180, 180);
    }
  }

  const placeMatch = pathName.match(/\/maps\/(?:place|search)\/([^/@]+)/i);
  const rawName = placeMatch?.[1] || (query && !/^\s*-?\d+(?:\.\d+)?\s*,/.test(query) ? query : null);
  const name = rawName ? rawName.replace(/\+/g, " ").trim().slice(0, 150) : null;
  return { name: name || null, latitude, longitude };
}

function boundedCoordinate(value: string, min: number, max: number): number | null {
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
