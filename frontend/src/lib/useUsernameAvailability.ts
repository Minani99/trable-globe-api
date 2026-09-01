"use client";

import { useEffect, useMemo, useState } from "react";

import type { ApiEnvelope } from "@/lib/api/client";
import { validateUsername } from "@/lib/username";

interface AvailabilityData {
  available: boolean;
  normalizedUsername: string;
  message: string;
}

export interface UsernameAvailabilityState {
  status: "empty" | "invalid" | "checking" | "available" | "unavailable" | "current" | "error";
  message: string | null;
}

export function useUsernameAvailability(username: string, currentUsername?: string) {
  const localError = useMemo(() => username ? validateUsername(username) : null, [username]);
  const normalized = username.trim().toLowerCase();
  const [remoteState, setRemoteState] = useState<UsernameAvailabilityState & { username: string }>({
    status: "checking",
    message: "사용 가능 여부를 확인하고 있어요…",
    username: "",
  });

  useEffect(() => {
    if (!normalized || localError || (currentUsername && normalized === currentUsername.toLowerCase())) return;

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setRemoteState({ status: "checking", message: "사용 가능 여부를 확인하고 있어요…", username: normalized });
      try {
        const response = await fetch(`/api/auth/username-availability?username=${encodeURIComponent(normalized)}`, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const envelope = await response.json() as ApiEnvelope<AvailabilityData>;
        const data = envelope.data;
        if (!response.ok || !envelope.success || !data) {
          setRemoteState({ status: "error", message: envelope.message ?? "사용 가능 여부를 미리 확인하지 못했습니다. 가입할 때 다시 확인합니다.", username: normalized });
          return;
        }
        setRemoteState({
          status: data.available ? "available" : "unavailable",
          message: data.message,
          username: normalized,
        });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setRemoteState({ status: "error", message: "사용 가능 여부를 미리 확인하지 못했습니다. 저장할 때 다시 확인합니다.", username: normalized });
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentUsername, localError, normalized]);

  if (!normalized) return { status: "empty", message: null } satisfies UsernameAvailabilityState;
  if (localError) return { status: "invalid", message: localError } satisfies UsernameAvailabilityState;
  if (currentUsername && normalized === currentUsername.toLowerCase()) {
    return { status: "current", message: "현재 사용 중인 사용자명입니다." } satisfies UsernameAvailabilityState;
  }
  if (remoteState.username !== normalized) {
    return { status: "checking", message: "사용 가능 여부를 확인하고 있어요…" } satisfies UsernameAvailabilityState;
  }
  return remoteState;
}
