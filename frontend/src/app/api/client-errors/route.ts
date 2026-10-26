import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/lib/api/auth-route";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { recordError, sanitizeErrorReport } from "@/lib/error-reporting";

const MAX_BODY_BYTES = 8 * 1024;

/** Receives browser error reports. Always answers 204 so a failing report never surfaces. */
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return new NextResponse(null, { status: 204 });
  // A broken page can throw in a loop; cap what one visitor can write to the log.
  if (!(await checkRateLimit("client-error", request)).allowed) return new NextResponse(null, { status: 204 });
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 204 });
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  const report = sanitizeErrorReport(body, "client");
  if (report) await recordError({ ...report, userAgent: request.headers.get("user-agent")?.slice(0, 200) ?? undefined });
  return new NextResponse(null, { status: 204 });
}
