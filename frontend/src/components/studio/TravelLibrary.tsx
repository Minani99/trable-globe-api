"use client";

import Link from "next/link";
import { useState } from "react";
import { WorkspaceTabs } from "@/components/common/WorkspaceTabs";
import { JourneyArtwork } from "@/components/common/JourneyArtwork";
import { tripTiming } from "@/lib/trip-timing";
import { formatDateRange } from "@/lib/utils/format";
import type { OwnedTravelSummary } from "@/types";
import styles from "./TravelLibrary.module.css";

export function TravelLibrary({ travels, today }: { travels: OwnedTravelSummary[]; today: string }) {
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const groups = [travels, travels.filter(({ travel }) => travel.startDate > today).sort((a, b) => a.travel.startDate.localeCompare(b.travel.startDate)), travels.filter(({ travel }) => travel.startDate <= today && travel.endDate >= today), travels.filter(({ travel }) => travel.endDate < today)];
  const visible = groups[active].filter(({ travel }) => `${travel.title} ${travel.primaryCountry?.nameKo ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className={styles.library} aria-label="내 여행 목록">
    <div className={styles.heading}><h2>모든 여행 <span>{travels.length}</span></h2><label className={styles.search}><span className="sr-only">내 여행 검색</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="여행 이름, 나라 검색" /></label></div>
    <WorkspaceTabs id="travel-library" label="여행 상태" items={["전체", "계획 중", "여행 중", "다녀온 여행"]} active={active} onChange={setActive} />
    {[0, 1, 2, 3].map((index) => <div key={index} id={`travel-library-panel-${index}`} role="tabpanel" aria-labelledby={`travel-library-tab-${index}`} hidden={active !== index}>
      {active === index ? visible.length ? <ol className={styles.list} aria-label="여행 목록">{visible.map(({ travel, visibility }) => {
        const timing = tripTiming(travel.startDate, travel.endDate, visibility, today);
        // Each stage opens where its next step is: planning, today's view inside the
        // editor, or the finish-and-publish flow for a trip that was never written up.
        const query = timing.stage === "plan" ? "?plan=1" : timing.stage === "finish" ? "?finish=1" : "";
        return <li key={travel.id}><Link href={`/studio/travels/${travel.id}/edit${query}`} className={styles.row} data-stage={timing.stage}>
          <JourneyArtwork city={travel.primaryCity?.nameKo} country={travel.primaryCountry?.iso2Code} className={styles.cover} src={travel.coverImageUrl} sizes="(max-width: 700px) 72px, 128px" alt={`${travel.title} 대표 장면`} />
          <span className={styles.copy}><strong>{travel.title}</strong><span>{travel.primaryCountry?.nameKo ?? "여행"} · {formatDateRange(travel.startDate, travel.endDate)}</span></span>
          <span className={styles.meta}>
            <span className={styles.status}>
              <span className={styles.chip}>{timing.label}</span>
              {timing.badge ? <b className={styles.badge}>{timing.badge}</b> : null}
            </span>
            <small>{visibility === "PUBLIC" ? "공개" : "비공개"} · 장소 {travel.placeCount}곳{timing.stage === "finish" ? " · 사진과 기록을 남겨 보세요" : ""}</small>
          </span>
        </Link></li>;
      })}</ol> : <div className={styles.empty}><h3>{query ? "검색된 여행이 없습니다" : travels.length ? "아직 이곳에 여행이 없습니다" : "첫 여행을 시작해 보세요"}</h3><p>{query ? "다른 여행 이름이나 나라로 검색해 보세요." : "국내 도시나 해외 여행지와 날짜를 정하고 나에게 맞는 여행을 시작하세요."}</p>{!query ? <Link href="/studio/plans/new">새 여행 계획 →</Link> : null}</div> : null}
    </div>)}
  </section>;
}
