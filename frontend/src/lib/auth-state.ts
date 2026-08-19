"use client";

import type { AuthMember } from "@/types";

type AuthState = AuthMember | null | undefined;
type Listener = (member: AuthState) => void;

let cachedMember: AuthState;
let currentRequest: Promise<AuthMember | null> | null = null;
const listeners = new Set<Listener>();

export function getCachedAuthMember(): AuthState {
  return cachedMember;
}

export function setCachedAuthMember(member: AuthMember | null) {
  cachedMember = member;
  listeners.forEach((listener) => listener(member));
}

export function subscribeToAuthState(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadAuthMember(): Promise<AuthMember | null> {
  if (cachedMember !== undefined) return cachedMember;
  if (currentRequest) return currentRequest;

  currentRequest = fetch("/api/auth/me", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) return null;
      const body = (await response.json()) as { data?: AuthMember };
      return body.data ?? null;
    })
    .catch(() => null)
    .then((member) => {
      setCachedAuthMember(member);
      return member;
    })
    .finally(() => {
      currentRequest = null;
    });

  return currentRequest;
}
