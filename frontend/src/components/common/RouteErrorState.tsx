"use client";

import Link from "next/link";
import { useEffect } from "react";

export function RouteErrorState({
  error,
  reset,
  eyebrow,
  title,
  description,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const feedbackParams = new URLSearchParams({ area: "기타", intent: title });
  if (error.digest) feedbackParams.set("requestId", error.digest);
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main id="main" className="route-state-page">
      <Link href="/" className="route-state-page__brand">TRAVEL GLOBE</Link>
      <section className="route-state-card" role="alert">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
        <div>
          <button type="button" onClick={reset}>다시 시도</button>
          <Link href="/">홈으로</Link>
        </div>
        <Link className="route-state-card__feedback" href={`/feedback?${feedbackParams}`}>계속 안 되면 오류 알려주기</Link>
        {error.digest ? <small>오류 번호 {error.digest}</small> : null}
      </section>
    </main>
  );
}
