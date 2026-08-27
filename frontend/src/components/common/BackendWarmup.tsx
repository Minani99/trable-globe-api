"use client";

import { useEffect } from "react";

const WARMUP_KEY = "travel-globe-api-warmup";
const WARMUP_INTERVAL_MS = 10 * 60 * 1000;
const WARMUP_TIMEOUT_MS = 60 * 1000;

/**
 * Starts waking the API as soon as the static shell becomes interactive.
 *
 * Render's beta instance can sleep between visits. Warming it in the background means
 * visitors can read the landing or sign-in screen while the API starts, instead of
 * paying the entire cold-start cost after pressing the first action button.
 */
export function BackendWarmup() {
  useEffect(() => {
    let lastWarmup = 0;
    try {
      lastWarmup = Number(sessionStorage.getItem(WARMUP_KEY) ?? 0);
    } catch {
      // Storage can be unavailable in privacy-focused browsers; warming still works.
    }

    if (Date.now() - lastWarmup < WARMUP_INTERVAL_MS) return;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS);
    void fetch("/api/health", {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    }).then((response) => {
      if (!response.ok) return;
      try {
        sessionStorage.setItem(WARMUP_KEY, String(Date.now()));
      } catch {
        // A successful wake-up does not depend on browser storage.
      }
    }).catch(() => {
      // Route-level loading and error states remain the visible recovery path.
    }).finally(() => window.clearTimeout(timer));

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return null;
}
