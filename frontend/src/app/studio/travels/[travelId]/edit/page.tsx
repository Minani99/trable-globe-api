import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TravelEditor } from "@/components/studio/TravelEditor";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";
import type { TravelDetail } from "@/types";

export const metadata: Metadata = { title: "여행 기록 편집", robots: { index: false, follow: false } };

export default async function EditTravelPage(props: PageProps<"/studio/travels/[travelId]/edit">) {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=/studio");
  const { travelId } = await props.params;
  const id = Number(travelId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const travel = await authenticatedBackendGet<TravelDetail>(`/api/private/travels/${id}`);
  if (!travel) notFound();
  return (
    <><SiteHeader username={member.username} /><main id="main" className="studio-page flex-1"><div className="site-shell travel-editor-shell"><nav className="studio-breadcrumb"><Link href="/studio">← 내 여행 관리</Link></nav><header className="travel-editor-hero"><p className="eyebrow">Edit journey</p><h1>{travel.title}</h1><p>저장하는 순간 공개 지구본과 상세 페이지에도 반영됩니다.</p></header><TravelEditor username={member.username} countries={countryOptions} initialTravel={travel} /></div></main><SiteFooter /></>
  );
}
