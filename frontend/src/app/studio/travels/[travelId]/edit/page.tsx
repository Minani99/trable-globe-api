import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileTripCompanion } from "@/components/layout/MobileTripCompanion";
import { TravelModeEditorPanel } from "@/components/layout/TravelModeEditorPanel";
import { MobilePlanningWorkspace } from "@/components/planner/MobilePlanningWorkspace";
import { TravelPreparationHub } from "@/components/planner/TravelPreparationHub";
import { TravelEditor } from "@/components/studio/TravelEditor";
import { TravelFinishEditor } from "@/components/studio/TravelFinishEditor";
import { TravelChecklist } from "@/components/studio/TravelChecklist";
import { TravelPlanningBoard } from "@/components/studio/TravelPlanningBoard";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";
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
  const planningMode = travel.visibility === "PRIVATE" && (travel.endDate > today || hasPlanningData);
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
    <><SiteHeader username={member.username} member={member} /><main id="main" className="studio-page flex-1"><div className={`site-shell travel-editor-shell${finishMode ? " is-finishing" : ""}`}><nav className="studio-breadcrumb"><Link href="/studio">← 여행 허브</Link><Link href={`/studio/travels/${travel.id}/go`}>여행용 보기</Link>{finishMode ? <Link href={`/studio/travels/${travel.id}/edit?plan=1`}>전체 편집</Link> : null}</nav><header className={`travel-editor-hero${planningMode ? " is-planning" : ""}${finishMode ? " is-finishing" : ""}`}><h1>{finishMode ? "기록으로 남길 준비" : travel.title}</h1><p>{finishMode ? "장소와 대표 사진, 메모를 확인하세요." : travelMode ? "오늘 일정과 다음 장소를 확인하고 사진과 메모를 남길 수 있습니다." : planningMode ? (travel.endDate <= today ? "실제 장소와 사진을 확인한 뒤 여행 기록으로 완성하세요." : "일정과 예약, 예산을 확인하고 필요한 부분만 수정하세요.") : "저장하면 지구본과 공개 페이지에 반영됩니다."}</p></header>{travelMode && !finishMode ? <div id="travel-day-view"><MobileTripCompanion travel={travel} today={today} username={member.username} variant="page" /></div> : null}{travelMode && !finishMode ? <TravelModeEditorPanel>{editor}</TravelModeEditorPanel> : editor}</div></main><SiteFooter /></>
  );
}

function emptyPlanning(): TravelPlanning {
  return { targetAmount: 0, currency: "KRW", estimatedAmount: 0, paidAmount: 0, remainingAmount: 0, expenses: [], reservations: [] };
}
