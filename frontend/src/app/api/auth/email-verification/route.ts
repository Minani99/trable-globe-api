import { NextRequest } from "next/server";

import { forwardWithSession, isSameOriginRequest, passThrough } from "@/lib/api/auth-route";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ success: false, data: null, message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  return passThrough(await forwardWithSession("/api/auth/email-verification", { method: "POST" }));
}
