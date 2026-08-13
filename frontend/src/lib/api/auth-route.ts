import "server-only";

import { NextResponse } from "next/server";

import { getApiBaseUrl } from "@/lib/config";
import { SESSION_COOKIE } from "@/lib/api/server-session";
import type { ApiEnvelope } from "@/lib/api/client";
import type { AuthMember } from "@/types";

interface BackendSession {
  token: string;
  expiresAt: string;
  member: AuthMember;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const originUrl = new URL(origin);
  const acceptedHostnames = new Set([
    requestUrl.hostname,
    request.headers.get("host"),
    forwardedHost,
  ].flatMap((host) => {
    if (!host) {
      return [];
    }
    try {
      return [new URL(`http://${host}`).hostname];
    } catch {
      return [];
    }
  }));

  return acceptedHostnames.has(originUrl.hostname);
}

export async function handleAuthStart(request: Request, action: "login" | "register") {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, data: null, message: "허용되지 않은 요청입니다.", error: { code: "ACCESS_DENIED" } },
      { status: 403 },
    );
  }
  let backendResponse: Response;
  try {
    backendResponse = await fetch(`${getApiBaseUrl()}/api/auth/${action}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", error: { code: "BACKEND_UNREACHABLE" } },
      { status: 503 },
    );
  }

  const envelope = (await backendResponse.json()) as ApiEnvelope<BackendSession>;
  if (!backendResponse.ok || !envelope.success || !envelope.data) {
    return NextResponse.json(envelope, {
      status: backendResponse.status,
      headers: forwardedResponseHeaders(backendResponse),
    });
  }

  const response = NextResponse.json(
    { ...envelope, data: envelope.data.member },
    { status: backendResponse.status, headers: forwardedResponseHeaders(backendResponse) },
  );
  response.cookies.set(SESSION_COOKIE, envelope.data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(envelope.data.expiresAt),
    priority: "high",
  });
  return response;
}

export async function forwardPublicAuth(request: Request, path: string) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { success: false, data: null, message: "허용되지 않은 요청입니다.", error: { code: "ACCESS_DENIED" } },
      { status: 403 },
    );
  }
  try {
    return passThrough(await fetch(`${getApiBaseUrl()}${path}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    }));
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", error: { code: "BACKEND_UNREACHABLE" } },
      { status: 503 },
    );
  }
}

export async function forwardWithSession(path: string, init: RequestInit = {}, sessionToken?: string) {
  const { cookies } = await import("next/headers");
  const token = (sessionToken || (await cookies()).get(SESSION_COOKIE)?.value)?.trim();
  if (!token) {
    return NextResponse.json(
      { success: false, data: null, message: "로그인이 필요합니다.", error: { code: "AUTHENTICATION_REQUIRED" } },
      { status: 401 },
    );
  }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);
  if (init.body) {
    headers.set("Content-Type", "application/json");
  }
  try {
    return await fetch(`${getApiBaseUrl()}${path}`, {
      ...init,
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    return NextResponse.json(
      { success: false, data: null, message: "서버가 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", error: { code: "BACKEND_UNREACHABLE" } },
      { status: 503 },
    );
  }
}

export async function passThrough(response: Response) {
  return new NextResponse(await response.arrayBuffer(), {
    status: response.status,
    headers: forwardedResponseHeaders(response),
  });
}

function forwardedResponseHeaders(response: Response) {
  const headers = new Headers({
    "Content-Type": response.headers.get("content-type") ?? "application/json",
  });
  const requestId = response.headers.get("x-request-id");
  if (requestId) {
    headers.set("X-Request-ID", requestId);
  }
  return headers;
}
