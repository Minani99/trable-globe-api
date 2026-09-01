import type { Metadata } from "next";

import { StateMessage } from "@/components/common/StateMessage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileExperience } from "@/components/profile/ProfileExperience";
import { ApiError } from "@/lib/api/client";
import { getCurrentMember } from "@/lib/api/server-session";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "@/lib/api/profile";
import { globePath, siteConfig } from "@/lib/config";
import { presentDemoProfile } from "@/lib/demo-profile";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "나의 여행 지구본",
  description: "방문한 나라와 도시, 이동 경로와 기억을 하나의 지구본에서 탐색하세요.",
  robots: { index: false, follow: false },
};

export default async function GlobeEntryPage() {
  let member = null;
  try {
    member = await getCurrentMember();
  } catch (error) {
    console.error("[globe] Could not resolve the current member; opening the public sample.", error);
  }

  const username = member?.username ?? siteConfig.demoUsername;
  let globeData: Awaited<ReturnType<typeof loadGlobeData>> | null = null;
  let loadError: unknown = null;

  try {
    globeData = await loadGlobeData(username);
  } catch (error) {
    loadError = error;
  }

  if (!globeData) {
    return (
      <>
        <SiteHeader member={member} />
        <main id="main" className="flex-1">
          <StateMessage
            variant="page"
            eyebrow="Globe connection"
            title="여행 지구본을 불러올 수 없습니다"
            description={
              loadError instanceof ApiError && loadError.isUnreachable
                ? "서버가 여행 기록을 준비하고 있습니다. 잠시 후 다시 열어 주세요."
                : "여행 기록은 안전하게 보관되어 있습니다. 잠시 후 다시 시도해 주세요."
            }
            action={{ href: globePath, label: "지구본 다시 불러오기" }}
          />
        </main>
        <SiteFooter compact />
      </>
    );
  }

  const { profile, countries, travels } = globeData;

  return (
    <>
      <SiteHeader username={profile.username} member={member} />
      <main id="main" className="globe-page flex-1">
        <ProfileExperience
          profile={profile}
          countries={countries}
          travels={travels}
          viewer={member}
          relationship={null}
          safetyStatus={null}
          mode="globe"
        />
      </main>
      <SiteFooter compact />
    </>
  );
}

async function loadGlobeData(username: string) {
  const [loadedProfile, countries, travels] = await Promise.all([
    fetchProfile(username),
    fetchVisitedCountries(username),
    fetchTravels(username),
  ]);

  return {
    profile: presentDemoProfile(loadedProfile),
    countries,
    travels,
  };
}
