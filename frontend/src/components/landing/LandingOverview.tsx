import Link from "next/link";

import { profilePath, siteConfig } from "@/lib/config";
import styles from "./LandingOverview.module.css";

const EXAMPLE_STOPS = [
  { time: "10:00", place: "후시미 이나리", category: "관광" },
  { time: "12:30", place: "니시키 시장", category: "점심" },
  { time: "15:00", place: "가모강", category: "산책" },
] as const;

/** Static examples: no extra client bundle, fake controls or scroll animation. */
export function LandingOverview() {
  return (
    <section className={`landing-overview site-shell ${styles.overview}`} aria-label="계획과 기록">
      <div className={styles.features}>
        <article className={styles.feature} aria-labelledby="plan-overview-title">
          <div className={styles.copy}>
            <p className={styles.eyebrow}>여행 전</p>
            <h2 id="plan-overview-title">일정은 한곳에.</h2>
            <p className={styles.description}>가고 싶은 장소와 예약, 메모를 날짜별로 정리하세요.</p>
          </div>

          <figure className={styles.preview}>
            <figcaption className={styles.previewHeading}>
              <span className={styles.exampleLabel}>일정 예시</span>
              <strong>교토 · 2박 3일</strong>
            </figcaption>
            <div className={styles.days} aria-label="1일차 일정 예시">
              <span className={styles.activeDay}>1일차</span>
              <span>2일차</span>
              <span>3일차</span>
            </div>
            <ol className={styles.schedule}>
              {EXAMPLE_STOPS.map((stop) => (
                <li key={stop.time}>
                  <span className={styles.time}>{stop.time}</span>
                  <span>{stop.place}</span>
                  <span className={styles.category}>{stop.category}</span>
                </li>
              ))}
            </ol>
          </figure>

          <Link className={styles.link} href="/studio/plans/new">
            여행 계획 만들기 <Arrow />
          </Link>
        </article>

        <article className={styles.feature} aria-labelledby="record-overview-title">
          <div className={styles.copy}>
            <p className={styles.eyebrow}>여행 후</p>
            <h2 id="record-overview-title">다녀온 여행은 기록으로.</h2>
            <p className={styles.description}>사진과 메모를 더해 남기고, 원하는 여행만 공개하세요.</p>
          </div>

          <figure className={styles.preview}>
            <figcaption className={styles.previewHeading}>
              <span className={styles.exampleLabel}>기록 예시</span>
              <strong>교토 · 2박 3일</strong>
            </figcaption>
            <span className={styles.visibility}>공개</span>
            <p className={styles.recordDate}>5월 14일 — 16일</p>
            <ol className={styles.route} aria-label="여행 경로 예시">
              {EXAMPLE_STOPS.map((stop) => (
                <li key={stop.place}>
                  <span className={styles.routeDot} aria-hidden="true" />
                  <span>{stop.place}</span>
                </li>
              ))}
            </ol>
            <p className={styles.recordSummary}>장소 3곳 <span aria-hidden="true">·</span> 사진 8장 <span aria-hidden="true">·</span> 메모 1개</p>
          </figure>

          <Link className={styles.link} href={profilePath(siteConfig.demoUsername)}>
            샘플 기록 보기 <Arrow />
          </Link>
        </article>
      </div>

      <div className={styles.browse}>
        <p>다른 사람들의 여행도 둘러보세요.</p>
        <Link className={styles.link} href="/discover">공개 여행 둘러보기 <Arrow /></Link>
      </div>
    </section>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
