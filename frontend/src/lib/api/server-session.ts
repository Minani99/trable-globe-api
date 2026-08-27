import "server-only";

import { cookies } from "next/headers";

import type { ApiEnvelope } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/config";
import type { AuthMember } from "@/types";

export const SESSION_COOKIE = "travel_globe_session";

export async function authenticatedBackendGet<T>(path: string): Promise<T | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(55_000),
  });
  if (response.status === 401 || response.status === 404) {
    return null;
  }
  const envelope = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok || !envelope.success || envelope.data === null) {
    throw new Error(envelope.message ?? `Backend request failed (${response.status})`);
  }
  return envelope.data;
}

export function getCurrentMember(): Promise<AuthMember | null> {
  return authenticatedBackendGet<AuthMember>("/api/auth/me");
}
