import { NextRequest, NextResponse } from "next/server";

import { searchAirportCatalog } from "@/lib/airport-catalog";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") ?? "8");
  const limit = Number.isFinite(requestedLimit) ? Math.min(10, Math.max(1, requestedLimit)) : 8;

  return NextResponse.json(
    { success: true, data: searchAirportCatalog(query, limit), message: null },
    { headers: { "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400" } },
  );
}
