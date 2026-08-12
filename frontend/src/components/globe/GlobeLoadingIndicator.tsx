interface GlobeLoadingIndicatorProps {
  className?: string;
  description?: string;
}

export function GlobeLoadingIndicator({
  className = "",
  description = "잠시만 기다려 주세요",
}: GlobeLoadingIndicatorProps) {
  return (
    <div
      className={`globe-loading-veil flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <div className="globe-loader" aria-hidden="true">
          <span className="globe-loader__sphere" />
          <span className="globe-loader__orbit" />
          <span className="globe-loader__marker" />
        </div>

        <div>
          <p className="text-content text-[0.88rem] font-medium">여행 지구본을 불러오는 중</p>
          <p className="text-content-faint mt-1 text-[0.72rem]">{description}</p>
        </div>
      </div>
    </div>
  );
}
