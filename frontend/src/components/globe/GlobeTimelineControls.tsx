"use client";

import { formatDate } from "@/lib/utils/format";
import type { GlobeTimelineMoment } from "@/lib/globeTimeline";

export function GlobeTimelineControls({
  moments,
  activeIndex,
  playing,
  engaged,
  onIndexChange,
  onTogglePlaying,
  onPresent,
}: {
  moments: GlobeTimelineMoment[];
  activeIndex: number;
  playing: boolean;
  engaged: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlaying: () => void;
  onPresent: () => void;
}) {
  const active = moments[activeIndex];
  if (!active) return null;

  return (
    <section className={`globe-time-controls${engaged ? " is-engaged" : ""}`} aria-label="여행 시간 탐색">
      <div className="globe-time-controls__heading">
        <div>
          <span>{engaged ? "그때의 세계" : "현재의 세계"}</span>
          <strong>{formatDate(active.date)}</strong>
        </div>
        <button type="button" onClick={onPresent} disabled={!engaged}>
          현재
        </button>
      </div>

      <div className="globe-time-controls__player">
        <button
          type="button"
          className="globe-time-controls__play"
          onClick={onTogglePlaying}
          aria-label={playing ? "여행 세계 재생 일시정지" : "여행 세계 재생"}
          aria-pressed={playing}
          disabled={moments.length <= 1}
        >
          {playing ? (
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M6.5 5.5v9M13.5 5.5v9" /></svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m7 5 7 5-7 5Z" /></svg>
          )}
        </button>
        <label className="globe-time-controls__range">
          <span className="sr-only">여행 시점 선택</span>
          <input
            type="range"
            min={0}
            max={Math.max(0, moments.length - 1)}
            step={1}
            value={activeIndex}
            onChange={(event) => onIndexChange(Number(event.target.value))}
            style={{ "--timeline-progress": `${moments.length <= 1 ? 100 : (activeIndex / (moments.length - 1)) * 100}%` } as React.CSSProperties}
          />
        </label>
        <output aria-live="polite">
          <strong>{active.travel.title}</strong>
          <span>{activeIndex + 1} / {moments.length}</span>
        </output>
      </div>
    </section>
  );
}
