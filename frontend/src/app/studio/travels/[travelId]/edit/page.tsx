import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobilePlanningWorkspace } from "@/components/planner/MobilePlanningWorkspace";
import { TravelPreparationHub } from "@/components/planner/TravelPreparationHub";
import { TravelEditor } from "@/components/studio/TravelEditor";
import { TravelFinishEditor } from "@/components/studio/TravelFinishEditor";
import { TravelChecklist } from "@/components/studio/TravelChecklist";
import { TravelPlanningBoard } from "@/components/studio/TravelPlanningBoard";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";
import { formatDateRange } from "@/lib/utils/format";
import { todayInKorea } from "@/lib/utils/date";
import type { TravelDetail, TravelPlanning, TravelTask } from "@/types";

export const metadata: Metadata = { title: "여행 기록 편집", robots: { index: false, follow: false } };

export default async function EditTravelPage(props: PageProps<"/studio/travels/[travelId]/edit">) {
  const { travelId } = await props.params;
  const searchParams = await props.searchParams;
  const id = Number(travelId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [member, travel, tasks, planning] = await Promise.all([
    getCurrentMember(),
    authenticatedBackendGet<TravelDetail>(`/api/private/travels/${id}`),
    authenticatedBackendGet<TravelTask[]>(`/api/private/travels/${id}/tasks`),
    authenticatedBackendGet<TravelPlanning>(`/api/private/travels/${id}/planning`),
  ]);
  if (!member) redirect("/login?next=/studio");
  if (!travel) notFound();
  const today = todayInKorea();
  const hasPlanningData = Boolean(tasks?.length || planning?.targetAmount || planning?.expenses.length || planning?.reservations.length);
  const planningMode = travel.visibility === "PRIVATE" && (travel.endDate >= today || hasPlanningData);
  const travelMode = travel.startDate <= today && today <= travel.endDate;
  const finishMode = searchParams.finish === "1" && travel.visibility === "PRIVATE" && travel.endDate <= today;
  const editor = finishMode ? <TravelFinishEditor username={member.username} travel={travel} /> : (
    planningMode ? (
      <MobilePlanningWorkspace
        travelId={travel.id}
        preparation={<TravelPreparationHub startDate={travel.startDate} endDate={travel.endDate} countryCode={travel.countries[0]?.iso2Code ?? travel.places[0]?.country.iso2Code ?? ""} destinationLabel={travel.places[0]?.city?.nameKo ?? travel.countries[0]?.nameKo ?? "여행지"} latitude={travel.places[0]?.latitude ?? travel.countries[0]?.latitude ?? 37.5665} longitude={travel.places[0]?.longitude ?? travel.countries[0]?.longitude ?? 126.978} places={travel.places} />}
        checklist={<TravelChecklist travelId={travel.id} initialTasks={tasks ?? []} />}
        budget={<TravelPlanningBoard travelId={travel.id} startDate={travel.startDate} endDate={travel.endDate} initialPlanning={planning ?? emptyPlanning()} />}
        editor={<div id="itinerary-editor"><TravelEditor username={member.username} countries={countryOptions} initialTravel={travel} planningMode={planningMode} today={today} /></div>}
      />
    ) : <div id="itinerary-editor"><TravelEditor username={member.username} countries={countryOptions} initialTravel={travel} planningMode={planningMode} today={today} /></div>
  );
  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="studio-page flex-1">
        <div className={`site-shell travel-editor-shell${finishMode ? " is-finishing" : ""}`}>
          <nav className="studio-breadcrumb" aria-label="현재 위치"><Link href="/studio">← 내 여행</Link><Link href={`/studio/travels/${travel.id}/go`}>여행용 보기 ↗</Link>{travel.visibility === "PUBLIC" ? <Link href={`/${member.username}/travel/${travel.id}`}>공개 기록 보기 ↗</Link> : null}{finishMode ? <Link href={`/studio/travels/${travel.id}/edit?plan=1`}>전체 편집</Link> : null}</nav>
          <header className="travel-editor-hero">
            <p className="page-caption">{travelMode ? "여행 중" : travel.startDate > today ? "계획 중" : "다녀온 여행"} · {travel.visibility === "PUBLIC" ? "공개" : "비공개"}</p>
            <h1>{finishMode ? "여행 기록 정리" : travel.title}</h1>
            <p>{formatDateRange(travel.startDate, travel.endDate)} · {travel.countries.map((country) => country.nameKo).join(" · ")}</p>
          </header>
          {editor}
        </div>
      </main>
      <SiteFooter compact />
    </>
  );
}

function emptyPlanning(): TravelPlanning {
  return { targetAmount: 0, currency: "KRW", estimatedAmount: 0, paidAmount: 0, remainingAmount: 0, expenses: [], reservations: [] };
}
