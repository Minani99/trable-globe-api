import { NextRequest, NextResponse } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";
import { SESSION_COOKIE } from "@/lib/api/server-session";

export async function PATCH(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, data: null, message: "허용되지 않은 요청입니다." },
      { status: 403 },
    );
  }
  return passThrough(await forwardWithSession(
    "/api/auth/password",
    { method: "PATCH", body: await request.text() },
    request.cookies.get(SESSION_COOKIE)?.value,
  ));
}
