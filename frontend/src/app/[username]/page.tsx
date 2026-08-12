import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StateMessage } from "@/components/common/StateMessage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileExperience } from "@/components/profile/ProfileExperience";
import { ApiError } from "@/lib/api/client";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "@/lib/api/profile";

/**
 * `generateMetadata` and the page body both need the profile. `cache` collapses that into
 * one request per render pass.
 */
const loadProfile = cache((username: string) => fetchProfile(username));

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const { username } = await props.params;

  try {
    const profile = await loadProfile(username);
    return {
      title: `${profile.displayName} (@${profile.username})`,
      description:
        profile.bio ??
        `${profile.displayName}님이 다녀온 ${profile.statistics.countryCount}개 나라를 지구본에서 확인해 보세요.`,
    };
  } catch {
    return { title: `@${username}` };
  }
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;

  let data: Awaited<ReturnType<typeof loadProfileBundle>>;
  try {
    data = await loadProfileBundle(username);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    return (
      <>
        <SiteHeader />
        <main id="main" className="flex-1">
          <StateMessage
            variant="page"
            eyebrow="Connection error"
            title="여행 기록을 불러오지 못했습니다"
            description={
              error instanceof ApiError && error.isUnreachable
                ? "여행 기록을 잠시 불러오지 못했습니다.\n잠시 후 다시 열어 주세요."
                : "잠시 후 다시 열어 주세요."
            }
            action={{ href: "/", label: "홈으로" }}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  const { profile, countries, travels } = data;

  return (
    <>
      <SiteHeader username={profile.username} />
      <main id="main" className="flex-1">
        <ProfileExperience profile={profile} countries={countries} travels={travels} />
      </main>
      <SiteFooter />
    </>
  );
}

/**
 * The profile page renders as one unit, so its three reads go out together rather than
 * waterfalling. A 404 on any of them means the handle does not exist.
 */
async function loadProfileBundle(username: string) {
  const [profile, countries, travels] = await Promise.all([
    loadProfile(username),
    fetchVisitedCountries(username),
    fetchTravels(username),
  ]);
  return { profile, countries, travels };
}

/**
 * Rendered per request. A profile is live, personal data, and this also keeps
 * `next build` from needing the API to be running.
 */
export const dynamic = "force-dynamic";
