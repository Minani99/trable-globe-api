import { NextResponse, type NextRequest } from "next/server";

import { forwardWithSession, passThrough } from "@/lib/api/auth-route";
import { SESSION_COOKIE } from "@/lib/api/server-session";

/**
 * `?optional=1` is the browser's background session probe: a visitor without a session
 * cookie is an expected state, not an error, so it answers 200 with `data: null` instead
 * of logging a 401 on every signed-out page view. Without the flag the endpoint keeps its
 * strict contract (401 AUTHENTICATION_REQUIRED) for API clients and smoke checks.
 */
export async function GET(request: NextRequest) {
  const optional = request.nextUrl.searchParams.get("optional") === "1";
  if (optional && !request.cookies.get(SESSION_COOKIE)?.value?.trim()) {
    return NextResponse.json(
      { success: true, data: null, message: null },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  return passThrough(await forwardWithSession("/api/auth/me"));
}
