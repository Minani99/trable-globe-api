import Link from "next/link";

import type { JourneyNextAction } from "@/lib/journey-next-action";
import { formatDateRange } from "@/lib/utils/format";
import styles from "./JourneyNextCard.module.css";

export function JourneyNextCard({ action }: { action: JourneyNextAction }) {
  const { trip: { travel }, phase } = action;
  return (
    <section className={styles.card} aria-labelledby="journey-next-heading" data-phase={phase}>
      <p className={styles.label}>{phase === "travel" ? "지금 여행 중" : phase === "plan" ? "다가오는 여행" : "최근 다녀온 여행"}</p>
      <div className={styles.body}>
        <div className={styles.copy}>
          <p className={styles.meta}>{travel.primaryCountry?.nameKo ?? "내 여행"} · {formatDateRange(travel.startDate, travel.endDate)}</p>
          <h2 id="journey-next-heading">{travel.title}</h2>
          <p>장소 {travel.placeCount}곳 · 사진 {travel.photoCount}장</p>
        </div>
        <Link href={action.href} className={styles.action}>{action.label}<span aria-hidden="true">→</span></Link>
      </div>
      {phase === "plan" ? <Link className={styles.secondary} href={`/studio/travels/${travel.id}/go`}>날짜별 일정 미리보기 <span aria-hidden="true">→</span></Link> : null}
    </section>
  );
}
