import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PlanBuilder } from "@/components/planner/PlanBuilder";
import { getCurrentMember } from "@/lib/api/server-session";
import { countryOptions } from "@/lib/countries";
import { todayInKorea } from "@/lib/utils/date";

export const metadata: Metadata = { title: "새 여행 계획", robots: { index: false, follow: false } };

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ country?: string }> }) {
  const member = await getCurrentMember();
  if (!member) redirect("/login?next=%2Fstudio%2Fplans%2Fnew");
  const { country } = await searchParams;
  const today = todayInKorea();
  const requestedCountry = country?.toUpperCase() ?? "";
  const initialCountryCode = countryOptions.some((option) => option.iso2Code === requestedCountry) ? requestedCountry : "";

  return (
    <>
      <SiteHeader username={member.username} member={member} />
      <main id="main" className="plan-page flex-1">
        <div className="site-shell plan-shell">
          <nav className="studio-breadcrumb" aria-label="현재 위치"><Link href="/studio">← 여행 허브</Link></nav>
          <header className="plan-hero">
            <p className="eyebrow">Plan in a few clicks</p>
            <h1>빈 페이지 없이,<br />다음 여행을 시작하세요.</h1>
            <p>나라와 날짜, 취향만 고르면 일차별 계획이 먼저 만들어집니다. 장소는 나중에 하나씩 바꿔도 됩니다.</p>
          </header>
          <PlanBuilder countries={countryOptions} today={today} initialCountryCode={initialCountryCode} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
