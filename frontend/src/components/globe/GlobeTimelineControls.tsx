"use client";

import { formatDate } from "@/lib/utils/format";
import type { GlobeTimelineMoment } from "@/lib/globeTimeline";

export function GlobeTimelineControls({
  moments,
  activeIndex,
  playing,
  engaged,
  expanded,
  onIndexChange,
  onTogglePlaying,
  onPresent,
  onExpandedChange,
  presentLabel = "현재",
}: {
  moments: GlobeTimelineMoment[];
  activeIndex: number;
  playing: boolean;
  engaged: boolean;
  expanded: boolean;
  onIndexChange: (index: number) => void;
  onTogglePlaying: () => void;
  onPresent: () => void;
  onExpandedChange: (expanded: boolean) => void;
  presentLabel?: string;
}) {
  const active = moments[activeIndex];
  if (!active) return null;
  const progress = moments.length <= 1 ? 100 : (activeIndex / (moments.length - 1)) * 100;
  const detailsId = "globe-timeline-details";

  return (
    <section
      className={`globe-time-controls${engaged ? " is-engaged" : ""}${expanded ? " is-expanded" : " is-collapsed"}`}
      aria-label="여행 시간 탐색"
    >
      <div className="globe-time-controls__bar">
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

        <div className="globe-time-controls__now">
          <span>{engaged ? "그때의 세계" : "현재의 세계"}</span>
          <strong>{active.travel.title}</strong>
          <small>{formatDate(active.date)} · {activeIndex + 1}/{moments.length}</small>
          <i aria-hidden="true"><span style={{ width: `${progress}%` }} /></i>
        </div>

        <button
          type="button"
          className="globe-time-controls__toggle"
          aria-expanded={expanded}
          aria-controls={detailsId}
          aria-label={expanded ? "타임라인 접기" : "타임라인 펼치기"}
          onClick={() => onExpandedChange(!expanded)}
        >
          <span>{expanded ? "접기" : "시간 여행"}</span>
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 8 5 5 5-5" /></svg>
        </button>
      </div>

      <div id={detailsId} className="globe-time-controls__details" hidden={!expanded}>
        <div className="globe-time-controls__heading">
          <div>
            <span>{engaged ? "그때의 세계" : "현재의 세계"}</span>
            <strong>{formatDate(active.date)}</strong>
          </div>
          <button type="button" onClick={onPresent} disabled={!engaged}>
            {presentLabel}
          </button>
        </div>

        <div className="globe-time-controls__player">
          <label className="globe-time-controls__range">
            <span className="sr-only">여행 시점 선택</span>
            <input
              type="range"
              min={0}
              max={Math.max(0, moments.length - 1)}
              step={1}
              value={activeIndex}
              onChange={(event) => onIndexChange(Number(event.target.value))}
              style={{ "--timeline-progress": `${progress}%` } as React.CSSProperties}
            />
          </label>
          <output aria-live="polite">
            <strong>{active.travel.title}</strong>
            <span>{activeIndex + 1} / {moments.length}</span>
          </output>
        </div>
      </div>
    </section>
  );
}
