import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { formatDateRange } from "@/lib/utils/format";
import type { OwnedTravelSummary } from "@/types";

export const metadata: Metadata = { title: "내 여행 관리", robots: { index: false, follow: false } };

export default async function StudioPage() {
  const [member, travelRecords] = await Promise.all([
    getCurrentMember(),
    authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels"),
  ]);
  if (!member) redirect("/login?next=/studio");
  const travels = travelRecords ?? [];
  const profileReady = Boolean(member.profileImageUrl && member.bio?.trim());

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="studio-page flex-1">
        <div className="site-shell studio-shell">
          <header className="studio-hero">
            <div>
              <p className="eyebrow">Travel studio · @{member.username}</p>
              <h1>내 여행을 기록하고 다듬는 곳</h1>
            </div>
            <div className="studio-hero__actions">
              <Link href={`/${member.username}`} className="studio-secondary-action">공개 프로필</Link>
              <Link href="/studio/travels/new" className="studio-primary-action">새 여행 기록 <span>＋</span></Link>
            </div>
          </header>

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
                  title="첫 여행 기록하기"
                  description="한 나라와 한 장소만 입력해도 내 지구본이 바로 변화합니다."
                  href="/studio/travels/new"
                  action="여행 시작"
                />
                <OnboardingStep
                  index="03"
                  title="완성된 지구본 공유하기"
                  description="첫 기록을 공개하면 고유 프로필 주소로 여행 세계를 공유할 수 있습니다."
                />
              </ol>
            </section>
          ) : null}

          {travels.length > 0 ? (
            <div className="studio-layout studio-layout--records">
              <section aria-labelledby="studio-travels-heading" className="studio-travels">
                <div className="studio-section-heading">
                  <h2 id="studio-travels-heading">여행 기록</h2>
                  <span>{travels.length}개</span>
                </div>
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
              </section>
            </div>
          ) : null}
        </div>
      </main>
      <SiteFooter />
    </>
  );
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
