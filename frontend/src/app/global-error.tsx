"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ui] unrecoverable render error", error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="state-message state-message--page" aria-labelledby="global-error-title">
          <p className="eyebrow">잠시 멈췄어요</p>
          <h1 id="global-error-title">화면을 불러오지 못했습니다</h1>
          <p>작성 중인 내용은 브라우저에 남아 있을 수 있습니다. 먼저 다시 시도해 주세요.</p>
          {error.digest ? <small>오류 번호 {error.digest}</small> : null}
          <div>
            <button type="button" className="profile-panel__primary-action" onClick={reset}>다시 시도</button>
            <Link href="/">홈으로 이동</Link>
          </div>
        </main>
      </body>
    </html>
  );
}
