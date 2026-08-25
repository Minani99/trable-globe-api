import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActivityFeed } from "@/components/studio/ActivityFeed";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import { formatDateRange } from "@/lib/utils/format";
import type { ActivityEvent, OwnedTravelSummary } from "@/types";

export const metadata: Metadata = { title: "여행 허브", robots: { index: false, follow: false } };

export default async function StudioPage() {
  const [member, travelRecords, activity] = await Promise.all([
    getCurrentMember(),
    authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels"),
    authenticatedBackendGet<ActivityEvent[]>("/api/private/activity?limit=8"),
  ]);
  if (!member) redirect("/login?next=/studio");
  const travels = travelRecords ?? [];
  const today = todayInKorea();
  const plans = travels.filter(({ travel, visibility }) => visibility === "PRIVATE" && travel.endDate > today);
  const readyToRemember = travels.filter(({ travel, visibility }) => visibility === "PRIVATE" && travel.endDate <= today);
  const records = travels.filter(({ visibility }) => visibility === "PUBLIC");
  const profileReady = Boolean(member.profileImageUrl && member.bio?.trim());

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="studio-page flex-1">
        <div className="site-shell studio-shell">
          <header className="studio-hero">
            <div>
              <p className="eyebrow">Travel studio · @{member.username}</p>
              <h1>다음 여행부터 지난 기록까지</h1>
              <p>계획은 가볍게 시작하고, 다녀온 뒤 그대로 나의 여행 세계에 남겨보세요.</p>
            </div>
            <div className="studio-hero__actions">
              <Link href={`/${member.username}`} className="studio-secondary-action">공개 프로필</Link>
              <Link href="/studio/travels/new" className="studio-secondary-action">지난 여행 기록</Link>
              <Link href="/studio/plans/new" className="studio-primary-action">새 여행 계획 <span>＋</span></Link>
            </div>
          </header>

          <section className="studio-plan-launch" aria-labelledby="studio-plan-launch-heading">
            <div>
              <p className="eyebrow">One-click planner</p>
              <h2 id="studio-plan-launch-heading">템플릿을 찾지 말고, 선택만 하세요.</h2>
              <p>나라·날짜·여행 취향을 고르면 일차별 뼈대가 만들어집니다. 여행이 끝나면 사진과 메모만 더해 기록으로 바꿀 수 있어요.</p>
            </div>
            <ol aria-label="여행 계획 흐름">
              <li><span>01</span>나라와 날짜</li>
              <li><span>02</span>취향과 속도</li>
              <li><span>03</span>일정 자동 생성</li>
            </ol>
            <Link href="/studio/plans/new">3분 만에 계획 만들기 <span aria-hidden="true">→</span></Link>
          </section>

          {plans.length > 0 ? (
            <section className="studio-plans" aria-labelledby="studio-plans-heading">
              <div className="studio-section-heading">
                <div><p className="eyebrow">Upcoming</p><h2 id="studio-plans-heading">다가오는 여행</h2></div>
                <span>{plans.length}개</span>
              </div>
              <ol className="studio-plan-list">
                {plans.map(({ travel }) => (
                  <li key={travel.id}>
                    <Link href={`/studio/travels/${travel.id}/edit?plan=1`}>
                      <div className="studio-plan-list__date"><strong>{countdownLabel(today, travel.startDate)}</strong><span>{formatDateRange(travel.startDate, travel.endDate)}</span></div>
                      <div><span>{travel.primaryCountry?.nameKo ?? "다음 여행"}</span><h3>{travel.title}</h3><p>일정 {travel.durationDays}일 · 장소 {travel.placeCount}곳</p></div>
                      <span className="studio-plan-list__action">계획 열기 →</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {readyToRemember.length > 0 ? (
            <section className="studio-memory-ready" aria-labelledby="studio-memory-ready-heading">
              <div className="studio-section-heading">
                <div><p className="eyebrow">Ready to remember</p><h2 id="studio-memory-ready-heading">기록으로 완성할 여행</h2></div>
                <span>{readyToRemember.length}개</span>
              </div>
              <p className="studio-memory-ready__intro">여행이 끝난 계획입니다. 실제로 다녀온 장소와 사진을 확인하면 같은 여행이 지구본의 기록이 됩니다.</p>
              <ol>
                {readyToRemember.map(({ travel }) => (
                  <li key={travel.id}>
                    <div className="studio-memory-ready__country"><span>{travel.primaryCountry?.iso2Code ?? "TR"}</span><small>{travel.primaryCountry?.nameKo ?? "지난 여행"}</small></div>
                    <div><h3>{travel.title}</h3><p>{formatDateRange(travel.startDate, travel.endDate)} · 장소 {travel.placeCount}곳 · 사진 {travel.photoCount}장</p></div>
                    <Link href={`/studio/travels/${travel.id}/edit?plan=1`}>기록 완성하기 <span aria-hidden="true">→</span></Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {travels.length === 0 ? (
            <section aria-labelledby="getting-started-heading" className="studio-onboarding">
              <header>
                <div>
                  <p className="eyebrow">Getting started</p>
                  <h2 id="getting-started-heading">내 여행 세계를 완성하는 순서</h2>
                </div>
                <span>{profileReady ? "1" : "0"} / 3</span>
              </header>
              <ol>
                <OnboardingStep
                  index="01"
                  title="나를 소개하기"
                  description="프로필 사진과 여행 취향을 추가해 공개 페이지의 첫인상을 만드세요."
                  href="/settings#profile"
                  action={profileReady ? "다시 편집" : "프로필 설정"}
                  complete={profileReady}
                />
                <OnboardingStep
                  index="02"
                  title="다음 여행 계획하기"
                  description="나라와 날짜, 취향만 고르면 일차별 일정이 자동으로 만들어집니다."
                  href="/studio/plans/new"
                  action="계획 시작"
                />
                <OnboardingStep
                  index="03"
                  title="계획을 기록으로 남기기"
                  description="다녀온 뒤 사진과 메모를 더하고 공개하면 지구본에 여행 세계가 쌓입니다."
                />
              </ol>
            </section>
          ) : null}

          <ActivityFeed events={activity ?? []} />

          {records.length > 0 ? (
            <div className="studio-layout studio-layout--records">
              <section aria-labelledby="studio-travels-heading" className="studio-travels">
                <div className="studio-section-heading">
                  <div><p className="eyebrow">Archive</p><h2 id="studio-travels-heading">공개한 여행</h2></div>
                  <span>{records.length}개</span>
                </div>
                <ol className="studio-travel-list">
                  {records.map(({ travel, visibility }) => (
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
              </section>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function countdownLabel(today: string, startDate: string): string {
  const difference = Math.ceil((Date.parse(`${startDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
  if (difference === 0) return "D-DAY";
  if (difference < 0) return "여행 중";
  return `D-${difference}`;
}

function OnboardingStep({
  index,
  title,
  description,
  href,
  action,
  complete = false,
}: {
  index: string;
  title: string;
  description: string;
  href?: string;
  action?: string;
  complete?: boolean;
}) {
  return (
    <li className={complete ? "is-complete" : undefined}>
      <span>{complete ? "✓" : index}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {href && action ? <Link href={href}>{action} →</Link> : <small>첫 여행 작성 후 열립니다</small>}
    </li>
  );
}
