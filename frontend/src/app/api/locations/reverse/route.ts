import { NextRequest, NextResponse } from "next/server";

import { waitForNominatimSlot } from "@/lib/nominatim";

interface NominatimReverseResult {
  display_name?: string;
  name?: string;
  address?: Record<string, string>;
}

export async function GET(request: NextRequest) {
  const latitude = Number(request.nextUrl.searchParams.get("lat"));
  const longitude = Number(request.nextUrl.searchParams.get("lng"));

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json(
      { success: false, data: null, message: "선택한 위치의 좌표를 확인해 주세요." },
      { status: 400 },
    );
  }

  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
    "accept-language": "ko,en",
  });

  try {
    await waitForNominatimSlot();
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "TravelGlobe/0.1 (https://travel-globe-minani99.vercel.app/about)",
        Referer: "https://travel-globe-minani99.vercel.app/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Reverse geocoder returned ${response.status}`);

    const result = (await response.json()) as NominatimReverseResult;
    const address = result.address ?? {};
    const city = address.city || address.town || address.village || address.municipality || address.county || "";
    const name = result.name || address.amenity || address.tourism || address.leisure
      || result.display_name?.split(",")[0]?.trim() || city || "선택한 위치";

    return NextResponse.json({
      success: true,
      data: {
        name,
        city,
        label: result.display_name || [name, city].filter(Boolean).join(", "),
        latitude,
        longitude,
      },
      message: null,
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "주소를 불러오지 못했습니다. 좌표는 그대로 선택할 수 있어요." },
      { status: 503 },
    );
  }
}
