import type { Metadata } from "next";

import { DiscoverExperience } from "@/components/discovery/DiscoverExperience";
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

export default async function DiscoverPage() {
  const member = await getCurrentMember();
  const recommendations = member
    ? await authenticatedBackendGet<MemberDiscovery[]>("/api/private/discovery/recommendations?limit=8")
    : await apiGet<MemberDiscovery[]>("/api/discovery/recommendations?limit=8");

  return (
    <>
      <SiteHeader username={member?.username} member={member} />
      <main id="main" className="discover-page flex-1">
        <div className="site-shell discover-shell">
          <header className="discover-hero">
            <h1>공개 여행 둘러보기</h1>
            <p>여행자와 목적지를 검색하고 공개된 여행 기록을 확인하세요.</p>
          </header>
          <DiscoverExperience
            recommendations={recommendations ?? []}
            viewerAuthenticated={Boolean(member)}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export const dynamic = "force-dynamic";
