"use client";

import { useState } from "react";

interface ShareProfileButtonProps {
  displayName: string;
}

export function ShareProfileButton({ displayName }: ShareProfileButtonProps) {
  const [status, setStatus] = useState<string | null>(null);

  async function shareProfile() {
    const url = window.location.href;
    setStatus(null);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${displayName}의 Travel Globe`,
          text: `${displayName}의 여행 세계를 둘러보세요.`,
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
    <div className="profile-share">
      <button type="button" onClick={shareProfile}>
        <span aria-hidden="true">↗</span>
        지구본 공유
      </button>
      <span className="profile-share__status" role="status" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
