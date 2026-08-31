import type { Metadata } from "next";

import { DiscoverExperience } from "@/components/discovery/DiscoverExperience";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { apiGet } from "@/lib/api/client";
import type { MemberDiscovery } from "@/types";

export const metadata: Metadata = {
  title: "여행 세계 둘러보기",
  description: "공개 Journey가 쌓인 여행자의 세계와 최근 목적지를 발견해 보세요.",
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
            <p className="eyebrow">EXPLORE TRAVEL WORLDS</p>
            <h1>다른 사람의 여행 세계를 발견하세요</h1>
            <p>공개 Journey가 쌓인 지구본을 둘러보고, 다음 여행으로 이어질 도시와 경로를 만나보세요.</p>
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
