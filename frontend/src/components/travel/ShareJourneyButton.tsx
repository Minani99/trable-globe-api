"use client";

import { AppIcon } from "@/components/common/AppIcon";
import { useState } from "react";

interface ShareJourneyButtonProps {
  title: string;
  ownerName: string;
  course?: { date: string; day: number };
}

export function ShareJourneyButton({ title, ownerName, course }: ShareJourneyButtonProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");
  const [pending, setPending] = useState(false);

  async function shareJourney() {
    const target = new URL(window.location.pathname, window.location.origin);
    if (course) {
      target.searchParams.set("routeDay", course.date);
      target.hash = "course-map";
    }
    const url = target.href;
    setPending(true);
    setManualUrl("");
    setStatus(null);

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: course ? `${title} · ${course.day}일차` : `${title} · Travel Globe`,
            text: course ? `${ownerName}님의 ${course.day}일차 코스` : `${ownerName}님의 여행 기록을 지도와 사진으로 확인해 보세요.`,
            url,
          });
          setStatus(course ? "이날의 코스를 공유했습니다." : "여행 기록을 공유했습니다.");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      await navigator.clipboard.writeText(url);
      setStatus(course ? "이날의 코스 링크를 복사했습니다." : "여행 링크를 복사했습니다.");
    } catch {
      setManualUrl(url);
      setStatus("아래 링크를 복사해 주세요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="journey-share">
      <button type="button" onClick={shareJourney} disabled={pending} aria-busy={pending}><AppIcon name="share" />

        {pending ? "공유 준비 중" : course ? `${course.day}일차 링크 공유` : "여행 공유"}
      </button>
      <span className="journey-share__status" role="status" aria-live="polite">
        {status}
      </span>
      {manualUrl && <input aria-label="복사할 공유 링크" readOnly value={manualUrl} onFocus={event => event.target.select()} />}
    </div>
  );
}
