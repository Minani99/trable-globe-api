import { NextRequest, NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username") ?? "";
  try {
    const response = await fetch(
      `${getApiBaseUrl()}/api/auth/username-availability?username=${encodeURIComponent(username)}`,
      { headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(10_000) },
    );
    return new NextResponse(await response.arrayBuffer(), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "서버가 응답하지 않습니다.", error: { code: "BACKEND_UNREACHABLE" } },
      { status: 503 },
    );
  }
}
