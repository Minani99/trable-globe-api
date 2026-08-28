"use client";

import { useEffect, useState } from "react";

interface GlobeLoadingIndicatorProps {
  className?: string;
  description?: string;
  minimal?: boolean;
}

export function GlobeLoadingIndicator({
  className = "",
  description = "잠시만 기다려 주세요",
  minimal = false,
}: GlobeLoadingIndicatorProps) {
  const [detail, setDetail] = useState(description);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDetail("첫 연결이라면 서버를 깨우는 데 최대 1분이 걸릴 수 있어요");
    }, 8_000);
    return () => window.clearTimeout(timer);
  }, [description]);

  return (
    <div
      className={`globe-loading-veil${minimal ? " globe-loading-veil--minimal" : ""} flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="globe-loader" aria-hidden="true">
          <span className="globe-loader__sphere" />
          <span className="globe-loader__orbit" />
          <span className="globe-loader__marker" />
        </div>

        {minimal ? (
          <span className="sr-only">여행 지구본을 불러오는 중. {detail}</span>
        ) : (
          <div>
            <p className="text-content text-[0.88rem] font-medium">여행 지구본을 불러오는 중</p>
            <p className="text-content-faint mt-1 text-[0.72rem]">{detail}</p>
          </div>
        )}
      </div>
    </div>
  );
}
