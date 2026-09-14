import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import { formatDateRange } from "@/lib/utils/format";
import type { TravelDetail } from "@/types";

export const metadata: Metadata = {
  title: "여행용 보기",
  robots: { index: false, follow: false },
};

export default async function TravelDayPage(props: PageProps<"/studio/travels/[travelId]/go">) {
  const { travelId } = await props.params;
  const { date } = await props.searchParams;
  const initialDate = typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date ? date : undefined;
  const id = Number(travelId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [member, travel] = await Promise.all([
    getCurrentMember(),
    authenticatedBackendGet<TravelDetail>(`/api/private/travels/${id}`),
  ]);
  if (!member) redirect(`/login?next=/studio/travels/${id}/go`);
  if (!travel) notFound();

  const today = todayInKorea();
  const phase = today < travel.startDate ? "여행 전 미리보기" : today > travel.endDate ? "지난 일정" : "여행 중";

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="travel-day-page flex-1">
        <div className="site-shell travel-day-shell">
          <nav className="travel-day-page__nav" aria-label="여행용 보기 메뉴">
            <Link href="/studio">← 내 여행</Link>
            <Link href={today > travel.endDate ? `/studio/travels/${travel.id}/edit?finish=1` : `/studio/travels/${travel.id}/edit?plan=1#travel-preparation`}>{today > travel.endDate ? "여행 기록하기" : "계획 편집"}</Link>
          </nav>
          <header className="travel-day-page__hero">
            <div>
              <p>{phase}</p>
              <h1>{travel.title}</h1>
              <span>{formatDateRange(travel.startDate, travel.endDate)} · {travel.durationDays}일</span>
            </div>
          </header>
          <MobileTripCompanion travel={travel} today={today} username={member.username} variant="page" initialDate={initialDate} />
        </div>
      </main>
    </>
  );
}
