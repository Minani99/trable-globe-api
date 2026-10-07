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
          <nav className="studio-breadcrumb" aria-label="현재 위치"><Link href="/studio">← 내 여행</Link></nav>
          <header className="plan-hero">
            <h1>새 여행 계획</h1>
            <p>어디로, 언제 떠나나요? 자세한 일정은 나중에 채워도 괜찮아요.</p>
          </header>
          <PlanBuilder countries={countryOptions} today={today} initialCountryCode={initialCountryCode} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
