import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { TravelEditor } from "@/components/studio/TravelEditor";
import { getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";

export const metadata: Metadata = { title: "새 여행 기록", robots: { index: false, follow: false } };

export default async function NewTravelPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country } = await searchParams;
  const requestedCountry = country?.toUpperCase();
  const initialCountryCode = countryOptions.some((option) => option.iso2Code === requestedCountry)
    ? requestedCountry
    : undefined;
  const member = await getCurrentMember();
  if (!member) {
    const destination = initialCountryCode
      ? `/studio/travels/new?country=${encodeURIComponent(initialCountryCode)}`
      : "/studio/travels/new";
    redirect(`/login?next=${encodeURIComponent(destination)}`);
  }
  return (
    <><SiteHeader username={member.username} member={member} /><main id="main" className="studio-page flex-1"><div className="site-shell travel-editor-shell"><nav className="studio-breadcrumb"><Link href="/studio">← 여행 허브</Link></nav><header className="travel-editor-hero"><p className="eyebrow">Past journey</p><h1>지난 여행 기록하기</h1><p>이미 다녀온 여행이라면 장소와 사진을 더해 바로 지구본에 남겨보세요.</p></header><TravelEditor username={member.username} countries={countryOptions} initialCountryCode={initialCountryCode} /></div></main><SiteFooter /></>
  );
}
