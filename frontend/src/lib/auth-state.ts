"use client";

import type { AuthMember } from "@/types";

type AuthState = AuthMember | null | undefined;
type Listener = (member: AuthState) => void;

let cachedMember: AuthState;
let currentRequest: Promise<AuthMember | null> | null = null;
let revision = 0;
const listeners = new Set<Listener>();

export function getCachedAuthMember(): AuthState {
  return cachedMember;
}

export function setCachedAuthMember(member: AuthMember | null) {
  revision += 1;
  currentRequest = null;
  cachedMember = member;
  listeners.forEach((listener) => listener(member));
}

export function subscribeToAuthState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadAuthMember({ force = false }: { force?: boolean } = {}): Promise<AuthMember | null> {
  if (!force && cachedMember !== undefined) return cachedMember;
  if (currentRequest) return currentRequest;

  const requestRevision = revision;
  const request = fetch("/api/auth/me", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then(async (response) => {
      if (response.status === 401) return null;
      if (!response.ok) throw new Error("Session check unavailable");
      const body = (await response.json()) as { data?: AuthMember };
      return body.data ?? null;
    })
    // A temporarily unavailable backend is not a logout.
    .catch(() => cachedMember ?? null)
    .then((member) => {
      // Login/logout may have completed while this request was in flight.
      if (requestRevision !== revision) return cachedMember ?? null;
      setCachedAuthMember(member);
      return member;
    })
    .finally(() => {
      if (currentRequest === request) currentRequest = null;
    });

  currentRequest = request;
  return request;
}
