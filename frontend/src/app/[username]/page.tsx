import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StateMessage } from "@/components/common/StateMessage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileExperience } from "@/components/profile/ProfileExperience";
import { ApiError } from "@/lib/api/client";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { fetchProfile, fetchTravels, fetchVisitedCountries } from "@/lib/api/profile";
import { profilePath } from "@/lib/config";
import type { FollowStatus, MemberSafetyStatus } from "@/types";

/**
 * `generateMetadata` and the page body both need the profile. `cache` collapses that into
 * one request per render pass.
 */
const loadProfile = cache((username: string) => fetchProfile(username));
const loadTravels = cache((username: string) => fetchTravels(username));

export async function generateMetadata(props: PageProps<"/[username]">): Promise<Metadata> {
  const [{ username }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const year = parseYearParam(searchParams.year);

  try {
    const [profile, travels] = await Promise.all([
      loadProfile(username),
      year === null ? Promise.resolve(null) : loadTravels(username),
    ]);
    const sharedYear = year !== null && travels?.some((travel) => travel.startDate.startsWith(`${year}-`))
      ? year
      : null;
    return {
      title: sharedYear
        ? `${sharedYear} 여행 세계 · ${profile.displayName} (@${profile.username})`
        : `${profile.displayName} (@${profile.username})`,
      description: sharedYear
        ? `${profile.displayName}님이 ${sharedYear}년에 기록한 여행 동선과 기억을 지구본에서 만나보세요.`
        : profile.bio ??
          `${profile.displayName}님이 기록한 ${profile.statistics.countryCount}개 나라와 여행 이야기를 지구본에서 만나보세요.`,
    };
  } catch {
    return { title: `@${username}` };
  }
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const [{ username }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const initialYear = parseYearParam(searchParams.year);

  let data: Awaited<ReturnType<typeof loadProfileBundle>>;
  let viewer: Awaited<ReturnType<typeof getCurrentMember>> = null;
  try {
    [data, viewer] = await Promise.all([loadProfileBundle(username), getCurrentMember()]);
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
            eyebrow="연결 오류"
            title="여행 기록을 불러올 수 없습니다"
            description={
              error instanceof ApiError && error.isUnreachable
                ? "서버가 여행 기록을 준비하고 있습니다. 잠시 후 다시 열어 주세요."
                : "잠시 후 페이지를 다시 열어 주세요."
            }
            action={{ href: profilePath(username), label: "다시 불러오기" }}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  const { profile, countries, travels } = data;
  const [relationship, safetyStatus] = viewer && viewer.username !== profile.username
    ? await Promise.all([
        authenticatedBackendGet<FollowStatus>(
          `/api/private/discovery/profiles/${encodeURIComponent(profile.username)}`,
        ),
        authenticatedBackendGet<MemberSafetyStatus>(
          `/api/private/discovery/profiles/${encodeURIComponent(profile.username)}/safety`,
        ),
      ])
    : [null, null];

  return (
    <>
      <SiteHeader username={profile.username} member={viewer} />
      <main id="main" className="flex-1">
        <ProfileExperience
          profile={profile}
          countries={countries}
          travels={travels}
          viewer={viewer}
          relationship={relationship}
          safetyStatus={safetyStatus}
          initialYear={initialYear}
        />
      </main>
      <SiteFooter />
    </>
  );
}

function parseYearParam(value: string | string[] | undefined): number | null {
  if (Array.isArray(value) || !value || !/^\d{4}$/.test(value)) return null;
  const year = Number(value);
  return year >= 1900 && year <= 2100 ? year : null;
}

/**
 * The profile page renders as one unit, so its three reads go out together rather than
 * waterfalling. A 404 on any of them means the handle does not exist.
 */
async function loadProfileBundle(username: string) {
  const [profile, countries, travels] = await Promise.all([
    loadProfile(username),
    fetchVisitedCountries(username),
    loadTravels(username),
  ]);
  return { profile, countries, travels };
}

/**
 * Rendered per request. A profile is live, personal data, and this also keeps
 * `next build` from needing the API to be running.
 */
export const dynamic = "force-dynamic";
