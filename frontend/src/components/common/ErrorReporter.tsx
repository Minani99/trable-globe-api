"use client";

import { useEffect } from "react";

import { reportClientError } from "@/lib/report-client-error";

/** Browser noise that says nothing about this app's code. */
const IGNORED_MESSAGES = [/ResizeObserver loop/i, /^Script error\.?$/i];

/** Reports uncaught browser errors and rejected promises; error boundaries report their own. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (IGNORED_MESSAGES.some((pattern) => pattern.test(event.message))) return;
      // Errors from extensions and third-party scripts arrive with a foreign filename.
      if (event.filename && !event.filename.startsWith(window.location.origin)) return;
      reportClientError(event.error ?? event.message, { kind: "window-error" });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      reportClientError(event.reason, { kind: "unhandled-rejection" });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
