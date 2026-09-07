"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function TravelModeEditorPanel({ children }: { children: ReactNode }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = detailsRef.current;
    if (!details) return;

    const syncWithViewportAndHash = () => {
      const editingSection = ["#travel-place-editor", "#travel-photo-editor", "#travel-note-editor", "#itinerary-editor"]
        .some((hash) => window.location.hash.startsWith(hash));
      details.open = window.matchMedia("(min-width: 701px)").matches || editingSection;
    };

    syncWithViewportAndHash();
    window.addEventListener("hashchange", syncWithViewportAndHash);
    return () => window.removeEventListener("hashchange", syncWithViewportAndHash);
  }, []);

  return (
    <details className="travel-mode-editor-panel" ref={detailsRef}>
      <summary>
        <span><strong>전체 계획 및 기록 편집</strong><small>예약, 체크리스트, 일정, 사진</small></span>
        <b aria-hidden="true">⌄</b>
      </summary>
      <div className="travel-mode-editor-panel__content">{children}</div>
    </details>
  );
}
