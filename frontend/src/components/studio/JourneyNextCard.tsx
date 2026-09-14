import Link from "next/link";

import type { JourneyNextAction } from "@/lib/journey-next-action";
import { formatDateRange } from "@/lib/utils/format";
import styles from "./JourneyNextCard.module.css";

export function JourneyNextCard({ action }: { action: JourneyNextAction }) {
  const { trip: { travel }, phase } = action;
  return (
    <section className={styles.card} aria-labelledby="journey-next-heading" data-phase={phase}>
      <ol className={styles.steps} aria-label="여행 진행 단계">
        {([ ["plan", "계획"], ["travel", "여행 중"], ["record", "기록"] ] as const).map(([key, label]) => (
          <li key={key} aria-current={phase === key ? "step" : undefined}>{label}</li>
        ))}
      </ol>
      <div className={styles.body}>
        <div className={styles.copy}>
          <p className={styles.meta}>{travel.primaryCountry?.nameKo ?? "내 여행"} · {formatDateRange(travel.startDate, travel.endDate)}</p>
          <h2 id="journey-next-heading">{travel.title}</h2>
          <p>{action.description}</p>
        </div>
        <Link href={action.href} className={styles.action}>{action.label}<span aria-hidden="true">→</span></Link>
      </div>
      {phase === "plan" ? <Link className={styles.secondary} href={`/studio/travels/${travel.id}/go`}>날짜별 일정 미리보기 <span aria-hidden="true">→</span></Link> : null}
    </section>
  );
}
