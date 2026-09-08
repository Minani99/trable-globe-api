"use client";

import { useEffect } from "react";

interface UnsavedChangesGuardOptions {
  /** Whether there is anything to lose right now. */
  enabled: boolean;
  /** Shown in the confirm dialog when the user clicks an in-app link. */
  message: string;
  /** Called after the user confirms leaving so the caller can clear its dirty flag. */
  onLeave?: () => void;
}

/**
 * Warns before the user throws away unsaved edits.
 *
 * Two escape routes are covered: closing/refreshing the tab (`beforeunload`, where the
 * browser shows its own dialog) and clicking a same-tab link (intercepted in the capture
 * phase so Next.js's client router never sees the click if the user cancels).
 *
 * Used by every editor in the studio so the behaviour and wording stay identical.
 */
export function useUnsavedChangesGuard({ enabled, message, onLeave }: UnsavedChangesGuardOptions) {
  useEffect(() => {
    if (!enabled) return;

    const warnBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const warnBeforeLink = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onLeave?.();
    };

    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", warnBeforeLink, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", warnBeforeLink, true);
    };
  }, [enabled, message, onLeave]);
}

