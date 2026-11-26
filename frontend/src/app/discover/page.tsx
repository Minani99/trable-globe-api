import type { Metadata } from "next";
import { Suspense } from "react";

import { DiscoverExperience } from "@/components/discovery/DiscoverExperience";
import { CourseFinder } from "@/components/discovery/CourseFinder";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { apiGet } from "@/lib/api/client";
import type { MemberDiscovery } from "@/types";

export const metadata: Metadata = {
  title: "공개 여행 둘러보기",
  description: "여행자와 목적지를 검색하고 공개된 여행 기록을 확인하세요.",
  robots: { index: false, follow: false },
};

async function MemberDirectory({ signedIn }: { signedIn: boolean }) {
  const recommendations = signedIn
    ? await authenticatedBackendGet<MemberDiscovery[]>("/api/private/discovery/recommendations?limit=8")
    : await apiGet<MemberDiscovery[]>("/api/discovery/recommendations?limit=8");
  return <DiscoverExperience recommendations={recommendations ?? []} viewerAuthenticated={signedIn} />;
}

export default async function DiscoverPage({ searchParams }: PageProps<"/discover">) {
  const [member, params] = await Promise.all([getCurrentMember(), searchParams]);
  const destination = typeof params.destination === "string" ? params.destination.trim().slice(0, 60) : "";
  return (
    <>
      <SiteHeader username={member?.username} member={member} />
      <main id="main" className="discover-page flex-1">
        <div className="site-shell discover-shell">
          <header className="discover-hero">
            <h1>다른 여행자의 기록</h1>
          </header>
          <CourseFinder destination={destination} signedIn={Boolean(member)} />
          {!destination && <Suspense fallback={null}><MemberDirectory signedIn={Boolean(member)} /></Suspense>}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export const dynamic = "force-dynamic";
