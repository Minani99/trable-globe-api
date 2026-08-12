import { NextRequest, NextResponse } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, data: null, message: "허용되지 않은 요청입니다.", error: { code: "ACCESS_DENIED" } },
      { status: 403 },
    );
  }
  return passThrough(await forwardWithSession(
    "/api/auth/profile",
    { method: "PATCH", body: await request.text() },
    request.cookies.get("travel_globe_session")?.value,
  ));
}
