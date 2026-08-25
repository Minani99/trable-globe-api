import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TravelEditor } from "@/components/studio/TravelEditor";
import { TravelChecklist } from "@/components/studio/TravelChecklist";
import { TravelPlanningBoard } from "@/components/studio/TravelPlanningBoard";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";
import { todayInKorea } from "@/lib/utils/date";
import type { TravelDetail, TravelPlanning, TravelTask } from "@/types";

export const metadata: Metadata = { title: "여행 기록 편집", robots: { index: false, follow: false } };

export default async function EditTravelPage(props: PageProps<"/studio/travels/[travelId]/edit">) {
  const { travelId } = await props.params;
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
  const planningMode = travel.visibility === "PRIVATE" && travel.endDate >= today;
  return (
    <><SiteHeader username={member.username} member={member} /><main id="main" className="studio-page flex-1"><div className="site-shell travel-editor-shell"><nav className="studio-breadcrumb"><Link href="/studio">← 여행 허브</Link></nav><header className={`travel-editor-hero${planningMode ? " is-planning" : ""}`}><p className="eyebrow">{planningMode ? "Upcoming journey" : "Edit journey"}</p><h1>{travel.title}</h1><p>{planningMode ? "준비할 일과 예산, 예약을 확인하고 일차별 장소만 골라 계획을 완성하세요. 다녀온 뒤에는 그대로 기록으로 바꿀 수 있습니다." : "저장하는 순간 공개 지구본과 상세 페이지에도 반영됩니다."}</p></header>{planningMode ? <><TravelChecklist travelId={travel.id} initialTasks={tasks ?? []} /><TravelPlanningBoard travelId={travel.id} startDate={travel.startDate} initialPlanning={planning ?? emptyPlanning()} /></> : null}<TravelEditor username={member.username} countries={countryOptions} initialTravel={travel} planningMode={planningMode} /></div></main><SiteFooter /></>
  );
}

function emptyPlanning(): TravelPlanning {
  return { targetAmount: 0, currency: "KRW", estimatedAmount: 0, paidAmount: 0, remainingAmount: 0, expenses: [], reservations: [] };
}
