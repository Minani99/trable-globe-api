import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SaveSharedItinerary } from "@/components/travel/SaveSharedItinerary";
import { TravelRouteMap } from "@/components/travel/TravelRouteMap";
import { apiGet, ApiError } from "@/lib/api/client";
import { getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import { publicDisplayName } from "@/lib/utils/profile";
import type { TravelDetail } from "@/types";

export const metadata: Metadata = { title: "공유받은 여행 일정", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/.test(token)) notFound();
  let travel: TravelDetail;
  try { travel = await apiGet<TravelDetail>(`/api/shared/itineraries/${encodeURIComponent(token)}`); }
  catch (error) { if (error instanceof ApiError && error.isNotFound) notFound(); throw error; }
  const member = await getCurrentMember();
  return <><SiteHeader /><main id="main" className="shared-plan site-shell">
    <header><span className="shared-plan__eyebrow">함께 나누는 여행 일정</span><h1>{travel.title}</h1><p>{publicDisplayName(travel.owner.displayName)}님의 {travel.durationDays}일 여행 · {travel.places.length}개 장소</p><p>{travel.startDate} — {travel.endDate}</p></header>
    <SaveSharedItinerary travel={travel} signedIn={Boolean(member)} isOwner={member?.username === travel.owner.username} today={todayInKorea()} returnPath={`/share/${token}`} />
    {travel.description ? <p className="shared-plan__note">{travel.description}</p> : null}
    <TravelRouteMap places={travel.places} />
  </main></>;
}
