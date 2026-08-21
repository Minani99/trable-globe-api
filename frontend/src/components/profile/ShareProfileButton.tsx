"use client";

import { useState } from "react";

interface ShareProfileButtonProps {
  displayName: string;
  selectedYear?: number | null;
  variant?: "profile" | "recap";
}

export function ShareProfileButton({
  displayName,
  selectedYear = null,
  variant = "profile",
}: ShareProfileButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function shareProfile() {
    const shareUrl = new URL(window.location.href);
    if (selectedYear === null) {
      shareUrl.searchParams.delete("year");
    } else {
      shareUrl.searchParams.set("year", String(selectedYear));
    }
    const url = shareUrl.toString();
    const scope = selectedYear ? `${selectedYear}년 여행 세계` : "여행 세계";
    setStatus(null);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}의 ${scope}`,
          text: `${displayName}님이 지구본에 쌓은 ${scope}를 둘러보세요.`,
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setStatus("링크를 복사했습니다.");
    } catch {
      setStatus("주소창의 링크를 복사해 주세요.");
    }
  }

  return (
    <div className={`profile-share profile-share--${variant}`}>
      <button type="button" onClick={shareProfile}>
        <span aria-hidden="true">↗</span>
        {variant === "recap"
          ? selectedYear ? `${selectedYear} 리캡 공유` : "전체 리캡 공유"
          : "지구본 공유"}
      </button>
      <span className="profile-share__status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
