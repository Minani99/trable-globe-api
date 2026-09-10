"use client";

import { useState } from "react";

interface ShareJourneyButtonProps {
  title: string;
  ownerName: string;
}

export function ShareJourneyButton({ title, ownerName }: ShareJourneyButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function shareJourney() {
    const url = window.location.href;
    setPending(true);
    setStatus(null);

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${title} · Travel Globe`,
            text: `${ownerName}님의 여행 기록을 지도와 사진으로 확인해 보세요.`,
            url,
          });
          setStatus("여행 기록을 공유했습니다.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(url);
      setStatus("여행 링크를 복사했습니다.");
    } catch {
      setStatus("주소창의 링크를 복사해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="journey-share">
      <button type="button" onClick={shareJourney} disabled={pending} aria-busy={pending}>
        <span aria-hidden="true">↗</span>
        {pending ? "공유 준비 중" : "여행 공유"}
      </button>
      <span className="journey-share__status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
