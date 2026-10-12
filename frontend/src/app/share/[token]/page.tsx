import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SaveSharedItinerary } from "@/components/travel/SaveSharedItinerary";
import { TravelRouteMap } from "@/components/travel/TravelRouteMap";
import { apiGet, ApiError } from "@/lib/api/client";
import { getCurrentMember } from "@/lib/api/server-session";
import { todayInKorea } from "@/lib/utils/date";
import type { TravelDetail } from "@/types";

export const metadata: Metadata = { title: "공유받은 여행 일정", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function SharedPlanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9-]{36}$/.test(token)) notFound();
  let travel: TravelDetail;
  try { travel = await apiGet<TravelDetail>(`/api/shared/itineraries/${encodeURIComponent(token)}`); }
  catch (error) { if (error instanceof ApiError && error.isNotFound) notFound(); throw error; }
  const member = await getCurrentMember();
  const days = [...new Set(travel.places.map((place) => place.visitedAt || travel.startDate))].sort();
  return <><SiteHeader /><main className="shared-plan site-shell">
    <header><span className="shared-plan__eyebrow">함께 나누는 여행 일정</span><h1>{travel.title}</h1><p>{travel.owner.displayName}님의 {travel.durationDays}일 여행 · {travel.places.length}개 장소</p><p>{travel.startDate} — {travel.endDate}</p></header>
    <SaveSharedItinerary travel={travel} signedIn={Boolean(member)} isOwner={member?.username === travel.owner.username} today={todayInKorea()} returnPath={`/share/${token}`} />
    {travel.description ? <p className="shared-plan__note">{travel.description}</p> : null}
    <TravelRouteMap places={travel.places} />
    {days.map((day) => <section key={day} className="shared-plan__day"><h2>{day}</h2><ol>
      {travel.places.filter((place) => (place.visitedAt || travel.startDate) === day).map((place, index) => <li key={place.id}>
        <span className="editor-stop__sequence">{String(index + 1).padStart(2, "0")}</span><div><h3>{place.placeName}</h3><small>{[place.city?.nameKo || place.country.nameKo, place.startTime?.slice(0, 5), place.durationMinutes ? `${place.durationMinutes}분` : null].filter(Boolean).join(" · ")}</small>{place.memo ? <p>{place.memo}</p> : null}</div>
      </li>)}
    </ol></section>)}
  </main></>;
}
