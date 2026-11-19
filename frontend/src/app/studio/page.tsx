import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ActivityDisclosure } from "@/components/studio/ActivityDisclosure";
import { JourneyNextCard } from "@/components/studio/JourneyNextCard";
import { TravelLibrary } from "@/components/studio/TravelLibrary";
import { journeyGroups, nextJourneyAction } from "@/lib/journey-next-action";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import type { OwnedTravelSummary } from "@/types";
import { Icon } from "@/components/common/Icon";

export const metadata: Metadata = { title: "내 여행", robots: { index: false, follow: false } };

export default async function StudioPage() {
  const [member, travelRecords] = await Promise.all([
    getCurrentMember(), authenticatedBackendGet<OwnedTravelSummary[]>("/api/private/travels"),
  ]);
  if (!member) redirect("/login?next=/studio");
  const travels = travelRecords ?? [];
  const today = todayInKorea();
  const nextAction = nextJourneyAction(travels, today);
  const groups = journeyGroups(travels, today);
  const visitedCountries = new Set(
    travels.filter(({ travel }) => travel.startDate <= today)
      .flatMap(({ travel }) => travel.countries.map((country) => country.iso2Code)),
  ).size;
  const summary = [
    { label: "다가오는 여행", value: groups.plans.length, tone: "plan" },
    { label: "여행 중", value: groups.active.length, tone: "travel" },
    { label: "기록 전", value: groups.unfinished.length, tone: "finish" },
    { label: "다녀온 나라", value: visitedCountries, tone: "record" },
  ];
  return <>
    <SiteHeader username={member.username} member={member} />
    <main id="main" className="studio-page flex-1">
      <div className="site-shell studio-shell">
        <header className="studio-hero">
          <div><h1>내 여행</h1></div>
          <div className="studio-hero__actions"><Link href="/studio/travels/new" className="studio-secondary-action">지난 여행 기록</Link><Link href="/studio/plans/new" className="studio-primary-action"><Icon name="plus" /> 새 여행 계획</Link></div>
        </header>
        {nextAction ? <JourneyNextCard action={nextAction} today={today} /> : null}
        {travels.length ? (
          <dl className="studio-summary" aria-label="내 여행 요약">
            {summary.map((item) => (
              <div key={item.label} data-tone={item.tone}><dt>{item.label}</dt><dd>{item.value}</dd></div>
            ))}
          </dl>
        ) : null}
        <TravelLibrary travels={travels} today={today} />
        <ActivityDisclosure />
      </div>
    </main>
    <SiteFooter compact />
  </>;
}
