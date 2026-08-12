import { NextRequest, NextResponse } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";
import { SESSION_COOKIE } from "@/lib/api/server-session";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ success: false, message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const response = await passThrough(await forwardWithSession(
    "/api/auth/logout",
    { method: "POST" },
    request.cookies.get(SESSION_COOKIE)?.value,
  ));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
