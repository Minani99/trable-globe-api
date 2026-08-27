"use client";

import { useEffect, useState } from "react";

export function RouteLoadingState({ label = "여행 정보를 준비하고 있어요" }: { label?: string }) {
  const [message, setMessage] = useState(label);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessage("첫 연결을 준비하고 있어요. 최대 1분만 기다려 주세요");
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [label]);

  return (
    <main id="main" className="route-state-page" aria-busy="true" aria-live="polite">
      <span className="route-state-page__brand" aria-hidden="true">TRAVEL GLOBE</span>
      <section className="route-loading-card">
        <span className="route-loading-card__signal" aria-hidden="true" />
        <p>{message}</p>
        <div aria-hidden="true"><i /><i /><i /></div>
      </section>
    </main>
  );
}
