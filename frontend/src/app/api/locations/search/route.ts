import { NextRequest, NextResponse } from "next/server";

import { waitForNominatimSlot } from "@/lib/nominatim";

interface NominatimResult {
  place_id: number;
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const country = request.nextUrl.searchParams.get("country")?.trim().toLowerCase() ?? "";
  const latitudeRaw = request.nextUrl.searchParams.get("lat");
  const longitudeRaw = request.nextUrl.searchParams.get("lng");
  const latitude = latitudeRaw === null ? null : Number(latitudeRaw);
  const longitude = longitudeRaw === null ? null : Number(longitudeRaw);
  const hasProximity = latitude !== null && longitude !== null;

  if (query.length < 2 || query.length > 120 || (country && !/^[a-z]{2}$/.test(country))) {
    return NextResponse.json(
      { success: false, data: null, message: "장소 이름을 두 글자 이상 입력해 주세요." },
      { status: 400 },
    );
  }
  if ((latitudeRaw === null) !== (longitudeRaw === null)
    || (hasProximity && (!Number.isFinite(latitude) || !Number.isFinite(longitude)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180))) {
    return NextResponse.json(
      { success: false, data: null, message: "추천 기준 위치를 확인해 주세요." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    "accept-language": "ko,en",
  });
  if (country) params.set("countrycodes", country);
  if (hasProximity && latitude !== null && longitude !== null) {
    const latitudeDelta = 0.45;
    const longitudeDelta = Math.min(1.2, 0.45 / Math.max(0.35, Math.cos((latitude * Math.PI) / 180)));
    params.set("viewbox", `${longitude - longitudeDelta},${latitude - latitudeDelta},${longitude + longitudeDelta},${latitude + latitudeDelta}`);
    params.set("bounded", "0");
  }

  try {
    await waitForNominatimSlot();
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TravelGlobe/0.1 (https://travel-globe-minani99.vercel.app/about)",
        Referer: "https://travel-globe-minani99.vercel.app/",
      },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);

    const results = (await response.json()) as NominatimResult[];
    const data = results.map((result) => ({
      id: String(result.place_id),
      label: result.display_name,
      name: result.name || result.display_name.split(",")[0]?.trim() || query,
      city:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.municipality ||
        result.address?.county ||
        "",
      latitude: Number(result.lat),
      longitude: Number(result.lon),
    })).filter((result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude));

    return NextResponse.json(
      { success: true, data, message: null },
      { headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "장소 검색이 잠시 원활하지 않습니다. 지도를 눌러 위치를 선택해 주세요." },
      { status: 503 },
    );
  }
}
