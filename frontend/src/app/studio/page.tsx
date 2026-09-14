import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActivityFeed } from "@/components/studio/ActivityFeed";
import { JourneyNextCard } from "@/components/studio/JourneyNextCard";
import { journeyGroups, nextJourneyAction } from "@/lib/journey-next-action";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import { formatDateRange } from "@/lib/utils/format";
import { isPlaceholderPlaceName } from "@/lib/travel-placeholders";
import type { ActivityEvent, OwnedTravelSummary, TravelSummary } from "@/types";

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
  const { active, plans, unfinished: readyToRemember, records } = journeyGroups(travels, today);
  const nextAction = nextJourneyAction(travels, today);
  const profileReady = Boolean(member.profileImageUrl && member.bio?.trim());

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="studio-page flex-1">
        <div className="site-shell studio-shell">
          <header className={`studio-hero${nextAction ? " studio-hero--continuing" : ""}`}>
            <div>
              <h1>내 여행</h1>
              <p>계획부터 여행 중 일정, 다녀온 기록까지.</p>
            </div>
            <div className="studio-hero__actions">
              <Link href="/studio/travels/new" className="studio-secondary-action">지난 여행 기록</Link>
              <Link href="/studio/plans/new" className={nextAction ? "studio-secondary-action" : "studio-primary-action"}>새 여행 계획 <span>＋</span></Link>
            </div>
          </header>

          {nextAction ? <JourneyNextCard action={nextAction} /> : null}

          {Number(active.length > 0) + Number(plans.length > 0) + Number(readyToRemember.length > 0) + Number(records.length > 0) > 1 ? <nav className="studio-index" aria-label="내 여행 바로가기">
            {active.length > 0 ? <a href="#journey-next-heading">여행 중 <span>{active.length}</span></a> : null}
            {plans.length > 0 ? <a href="#studio-plans-heading">계획 <span>{plans.length}</span></a> : null}
            {readyToRemember.length > 0 ? <a href="#studio-memory-ready-heading">다녀온 여행 <span>{readyToRemember.length}</span></a> : null}
            {records.length > 0 ? <a href="#studio-travels-heading">공개 기록 <span>{records.length}</span></a> : null}
          </nav> : null}

          {active.length > 1 ? <section className="studio-plans" aria-label="여행 중인 다른 일정">
            <div className="studio-section-heading"><h2>여행 중인 다른 일정</h2></div>
            <ol className="studio-travel-list">{active.slice(1).map(({ travel }) => <li key={travel.id}>
              <Link href={`/studio/travels/${travel.id}/go?date=${today}`}><div><strong>{travel.title}</strong><p>{formatDateRange(travel.startDate, travel.endDate)}</p></div><span>오늘 일정 보기 →</span></Link>
            </li>)}</ol>
          </section> : null}

          {plans.length > 0 ? (
            <section className="studio-plans" aria-labelledby="studio-plans-heading">
              <div className="studio-section-heading">
                <div>
                  <h2 id="studio-plans-heading">작성 중인 여행 계획</h2>
                </div>
                <Link href="/studio/plans/new" className="studio-section-heading__action">＋ 새 계획</Link>
              </div>
                <ol className="studio-plan-list" aria-label="작성 중인 계획">
                  {plans.map((plan) => <PlanListItem key={plan.travel.id} plan={plan} today={today} />)}
                </ol>
            </section>
          ) : travels.length === 0 ? (
            <section className="studio-plan-launch" aria-labelledby="studio-plan-launch-heading">
              <div>
                <h2 id="studio-plan-launch-heading">새 여행 계획 만들기</h2>
                <p>나라와 날짜, 여행 취향을 고르면 일차별 일정이 만들어집니다.</p>
              </div>
              <ol aria-label="여행 계획 흐름">
                <li><span>01</span>나라와 날짜</li>
                <li><span>02</span>취향과 속도</li>
                <li><span>03</span>일정 자동 생성</li>
              </ol>
              <Link href="/studio/plans/new">첫 여행 계획하기 <span aria-hidden="true">→</span></Link>
            </section>
          ) : null}

          {readyToRemember.length > 0 ? (
            <section className="studio-memory-ready" aria-labelledby="studio-memory-ready-heading">
              <div className="studio-section-heading">
                <div><h2 id="studio-memory-ready-heading">기록으로 완성할 여행</h2></div>
                <span>{readyToRemember.length}개</span>
              </div>
              <p className="studio-memory-ready__intro">사진과 메모를 추가하고, 원하는 여행만 공개하세요.</p>
              <ol>
                {readyToRemember.map(({ travel }) => (
                  <li key={travel.id}>
                    <div className="studio-memory-ready__country"><span>{travel.primaryCountry?.iso2Code ?? "TR"}</span><small>{travel.primaryCountry?.nameKo ?? "지난 여행"}</small></div>
                    <div><h3>{travel.title}</h3><p>{formatDateRange(travel.startDate, travel.endDate)} · 장소 {travel.placeCount}곳 · 사진 {travel.photoCount}장</p></div>
                    <Link href={`/studio/travels/${travel.id}/edit?finish=1`}>여행 기록하기 <span aria-hidden="true">→</span></Link>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {travels.length === 0 ? (
            <details className="studio-onboarding">
              <summary>
                <div>
                  <h2 id="getting-started-heading">처음 이용하시나요?</h2>
                </div>
                <span>{profileReady ? "1" : "0"} / 3</span>
              </summary>
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
            </details>
          ) : null}

          <ActivityFeed events={activity ?? []} />

          {records.length > 0 ? (
            <div className="studio-layout studio-layout--records">
              <section aria-labelledby="studio-travels-heading" className="studio-travels">
                <div className="studio-section-heading">
                  <div><h2 id="studio-travels-heading">공개한 여행</h2></div>
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

function PlanListItem({ plan, today }: { plan: OwnedTravelSummary; today: string }) {
  const progress = planProgress(plan.travel);
  return (
    <li>
      <Link href={`/studio/travels/${plan.travel.id}/edit?plan=1`}>
        <div className="studio-plan-list__date"><strong>{countdownLabel(today, plan.travel.startDate)}</strong><span>{formatDateRange(plan.travel.startDate, plan.travel.endDate)}</span></div>
        <div><span>{plan.travel.primaryCountry?.nameKo ?? "다음 여행"}</span><h3>{plan.travel.title}</h3><p>장소 {progress.completed}/{progress.total} · {formatUpdatedAt(plan.updatedAt)}</p></div>
        <span className="studio-plan-list__action">이어서 계획하기 →</span>
      </Link>
      <Link href={`/studio/travels/${plan.travel.id}/go`} className="studio-plan-list__travel-view">여행용 보기 →</Link>
    </li>
  );
}

function planProgress(travel: TravelSummary) {
  const total = Math.max(1, travel.placeCount);
  const completed = Math.min(total, travel.routePoints.filter((place) => !isPlaceholderPlaceName(place.label)).length);
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}

function formatUpdatedAt(value: string) {
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 60_000));
  if (elapsedMinutes < 1) return "방금 수정";
  if (elapsedMinutes < 60) return `${elapsedMinutes}분 전 수정`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours}시간 전 수정`;
  const elapsedDays = Math.floor(elapsedHours / 24);
  if (elapsedDays < 7) return `${elapsedDays}일 전 수정`;
  return `${new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(new Date(value))} 수정`;
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
