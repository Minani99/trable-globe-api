import { NextRequest, NextResponse } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";

type Context = { params: Promise<{ path: string[] }> };

async function forward(request: NextRequest, context: Context) {
  if (!["GET", "HEAD"].includes(request.method)) {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json(
        { success: false, data: null, message: "허용되지 않은 요청입니다.", error: { code: "ACCESS_DENIED" } },
        { status: 403 },
      );
    }
  }
  const { path } = await context.params;
  const backendPath = `/api/private/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.text();
  return passThrough(await forwardWithSession(
    backendPath,
    { method: request.method, body },
    request.cookies.get("travel_globe_session")?.value,
  ));
}

export const GET = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
