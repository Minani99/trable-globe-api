import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActivityDisclosure } from "@/components/studio/ActivityDisclosure";
import { JourneyNextCard } from "@/components/studio/JourneyNextCard";
import { TravelLibrary } from "@/components/studio/TravelLibrary";
import { nextJourneyAction } from "@/lib/journey-next-action";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import type { ActivityEvent, OwnedTravelSummary } from "@/types";

export const metadata: Metadata = { title: "내 여행", robots: { index: false, follow: false } };

export default async function StudioPage() {
  const [member, travelRecords, activity] = await Promise.all([
    getCurrentMember(), authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels"),
    authenticatedBackendGet<ActivityEvent[]>("/api/private/activity?limit=8"),
  ]);
  if (!member) redirect("/login?next=/studio");
  const travels = travelRecords ?? [];
  const today = todayInKorea();
  const nextAction = nextJourneyAction(travels, today);
  return <>
    <SiteHeader username={member.username} member={member} />
    <main id="main" className="studio-page flex-1">
      <div className="site-shell studio-shell">
        <header className="studio-hero">
          <div><p className="page-caption">나의 여행 노트</p><h1>내 여행</h1><p>다가오는 여행부터, 오래 기억할 여행까지.</p></div>
          <div className="studio-hero__actions"><Link href="/studio/travels/new" className="studio-secondary-action">지난 여행 기록</Link><Link href="/studio/plans/new" className="studio-primary-action">＋ 새 여행 계획</Link></div>
        </header>
        {nextAction ? <JourneyNextCard action={nextAction} /> : null}
        <TravelLibrary travels={travels} today={today} />
        <ActivityDisclosure events={activity ?? []} />
      </div>
    </main>
    <SiteFooter compact />
  </>;
}
