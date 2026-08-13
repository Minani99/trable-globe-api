import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileEditor } from "@/components/studio/ProfileEditor";
import { AccountSettings } from "@/components/studio/AccountSettings";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { formatDateRange } from "@/lib/utils/format";
import type { OwnedTravelSummary } from "@/types";

export const metadata: Metadata = { title: "내 여행 관리", robots: { index: false, follow: false } };

export default async function StudioPage() {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/studio");
  const travels = (await authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels")) ?? [];

  return (
    <>
      <SiteHeader username={member.username} />
      <main id="main" className="studio-page flex-1">
        <div className="site-shell studio-shell">
          <header className="studio-hero">
            <div>
              <p className="eyebrow">Travel studio · @{member.username}</p>
              <h1>내 여행을<br />기록하고 다듬는 곳</h1>
            </div>
            <div className="studio-hero__actions">
              <Link href={`/${member.username}`} className="studio-secondary-action">공개 지구본 보기 ↗</Link>
              <Link href="/studio/travels/new" className="studio-primary-action">새 여행 기록 <span>＋</span></Link>
            </div>
          </header>

          <div className="studio-layout">
            <section aria-labelledby="studio-travels-heading" className="studio-travels">
              <div className="studio-section-heading">
                <div><p className="eyebrow">Your archive</p><h2 id="studio-travels-heading">여행 기록</h2></div>
                <span>{String(travels.length).padStart(2, "0")} journeys</span>
              </div>
              {travels.length ? (
                <ol className="studio-travel-list">
                  {travels.map(({ travel, visibility }) => (
                    <li key={travel.id}>
                      <Link href={`/studio/travels/${travel.id}/edit`}>
                        <span className="studio-travel-list__country">{travel.primaryCountry?.nameKo ?? "여행"}</span>
                        <div><strong>{travel.title}</strong><p>{formatDateRange(travel.startDate, travel.endDate)} · 장소 {travel.placeCount}곳</p></div>
                        <span className={`studio-visibility is-${visibility.toLowerCase()}`}>{visibility === "PUBLIC" ? "공개" : "비공개"}</span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="studio-empty">
                  <p>아직 기록한 여행이 없습니다.</p>
                  <Link href="/studio/travels/new">첫 여행 기록하기 →</Link>
                </div>
              )}
            </section>
            <aside className="studio-account-stack"><ProfileEditor member={member} /><AccountSettings member={member} /></aside>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
