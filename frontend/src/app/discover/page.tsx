import type { Metadata } from "next";

import { DiscoverExperience } from "@/components/discovery/DiscoverExperience";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { apiGet } from "@/lib/api/client";
import type { MemberDiscovery } from "@/types";

export const metadata: Metadata = {
  title: "사람 찾기",
  description: "이름과 사용자명으로 여행자를 찾고, 공통 여행지가 있는 사람을 만나보세요.",
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
            <p className="eyebrow">Discover travellers</p>
            <h1>새로운 여행 세계를<br />만나보세요</h1>
            <p>이름으로 사람을 찾거나, 내가 다녀온 나라와 겹치는 여행자를 발견해 보세요.</p>
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
