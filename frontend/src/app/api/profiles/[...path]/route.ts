import { NextRequest, NextResponse } from "next/server";

import { publicDataFetchCache } from "@/lib/api/public-cache";
import { getApiBaseUrl } from "@/lib/config";

type Context = { params: Promise<{ path: string[] }> };

/**
 * Browser reads of public profile data (the landing page's sample globe, a country's
 * trips on a profile) are answered from the server data cache instead of being proxied
 * to the API host on every view. Writes clear that cache, so the browser copy itself is
 * never stored: `no-store` keeps an edit visible on the next read.
 */
export async function GET(request: NextRequest, context: Context) {
  const { path } = await context.params;
  const backendPath = `/api/profiles/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  try {
    const response = await fetch(`${getApiBaseUrl()}${backendPath}`, {
      headers: { Accept: "application/json" },
      ...publicDataFetchCache,
      signal: AbortSignal.timeout(55_000),
    });
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json",
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", error: { code: "BACKEND_UNREACHABLE" } },
      { status: 503 },
    );
  }
}
