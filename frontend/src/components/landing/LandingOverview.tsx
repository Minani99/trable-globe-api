import Link from "next/link";

import { profilePath, siteConfig } from "@/lib/config";
import styles from "./LandingOverview.module.css";

const examples = {
  gangneung: ["강릉", "오죽헌", "강릉중앙시장", "경포호"],
  seoul: ["서울", "경복궁", "통인시장", "서촌"],
  kyoto: ["교토", "후시미 이나리", "니시키 시장", "가모강"],
  alps: ["쿠어 · 라이헤나우", "쿠어 구시가지", "아르카스 광장", "라이헤나우 철교"],
} as const;

/**
 * Static examples: no extra client bundle, fake controls or scroll animation. Planning,
 * recording and browsing are separate full-width bands so each reads as its own section.
 */
export function LandingOverview({ example }: { example: keyof typeof examples }) {
  const [city, ...stops] = examples[example];
  return (
    <>
      <section className={`landing-band landing-band--plan ${styles.band}`} aria-labelledby="plan-overview-title">
        <div className={`site-shell ${styles.feature}`}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>여행 전</p>
            <h2 id="plan-overview-title">준비부터 동선까지.</h2>
            <p className={styles.description}>가까운 국내 여행부터 해외 여행까지. 교통, 준비물, 예산을 챙기고 방문 순서에 맞는 이동 경로를 Google 지도로 확인하세요.</p>
          </div>

          <figure className={styles.preview}>
            <figcaption className={styles.previewHeading}>
              <span className={styles.exampleLabel}>일정 예시</span>
              <strong>{city} · 2박 3일</strong>
            </figcaption>
            <div className={styles.days} aria-label="1일차 일정 예시">
              <span className={styles.activeDay}>1일차</span>
              <span>2일차</span>
              <span>3일차</span>
            </div>
            <ol className={styles.schedule}>
              {stops.map((stop, index) => (
                <li key={stop}>
                  <span className={styles.time}>{String(index + 1).padStart(2, "0")}</span>
                  <span>{stop}</span>
                  <span className={styles.category}>{["관광", "점심", "산책"][index]}</span>
                </li>
              ))}
            </ol>
          </figure>

          <Link className={styles.link} href="/studio/plans/new">
            여행 계획 만들기 <Arrow />
          </Link>
        </div>
      </section>

      <section className={`landing-band landing-band--record ${styles.band}`} aria-labelledby="record-overview-title">
        <div className={`site-shell ${styles.feature} ${styles.featureReversed}`}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>여행 후</p>
            <h2 id="record-overview-title">다녀온 여행은 기록으로.</h2>
            <p className={styles.description}>사진과 메모를 더해 남기고, 원하는 여행만 공개하세요.</p>
          </div>

          <figure className={styles.preview}>
            <figcaption className={styles.previewHeading}>
              <span className={styles.exampleLabel}>기록 예시</span>
              <strong>{city} · 2박 3일</strong>
            </figcaption>
            <span className={styles.visibility}>공개</span>
            <p className={styles.recordDate}>5월 14일 — 16일</p>
            <ol className={styles.route} aria-label="여행 경로 예시">
              {stops.map((stop) => (
                <li key={stop}>
                  <span className={styles.routeDot} aria-hidden="true" />
                  <span>{stop}</span>
                </li>
              ))}
            </ol>
            <p className={styles.recordSummary}>장소 3곳 <span aria-hidden="true">·</span> 사진 8장 <span aria-hidden="true">·</span> 메모 1개</p>
          </figure>

          <Link className={styles.link} href={profilePath(siteConfig.demoUsername)}>
            샘플 기록 보기 <Arrow />
          </Link>
        </div>
      </section>

      <section className={`landing-band landing-band--browse ${styles.band}`} aria-labelledby="browse-overview-title">
        <div className={`site-shell ${styles.browse}`}>
          <div className={styles.copy}>
            <p className={styles.eyebrow}>둘러보기</p>
            <h2 id="browse-overview-title">다른 사람들의 여행도 둘러보세요.</h2>
            <p className={styles.description}>공개된 여행 기록에서 다음 여행지를 찾아보세요.</p>
          </div>
          <Link className={styles.link} href="/discover">공개 여행 둘러보기 <Arrow /></Link>
        </div>
      </section>
    </>
  );
}

function Arrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}
