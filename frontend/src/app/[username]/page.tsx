import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StateMessage } from "@/components/common/StateMessage";
import { JsonLd } from "@/components/common/JsonLd";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ProfileExperience } from "@/components/profile/ProfileExperience";
import { ApiError } from "@/lib/api/client";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import {
  fetchProfile,
  fetchProfileRecaps,
  fetchTravels,
  fetchVisitedCountries,
} from "@/lib/api/profile";
import { profilePath, profileRecapImagePath, siteConfig } from "@/lib/config";
import { presentDemoProfile } from "@/lib/demo-profile";
import { getSiteUrl } from "@/lib/site-url";
import { publicDisplayName } from "@/lib/utils/profile";
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
    const [loadedProfile, travels] = await Promise.all([
      loadProfile(username),
      year === null ? Promise.resolve(null) : loadTravels(username),
    ]);
    const profile = presentDemoProfile(loadedProfile);
    const sharedYear = year !== null && travels?.some((travel) => travel.startDate.startsWith(`${year}-`))
      ? year
      : null;
    const displayName = publicDisplayName(profile.displayName);
    const title = sharedYear
      ? `${sharedYear} 여행 세계 · ${displayName} (@${profile.username})`
      : `${displayName} (@${profile.username})`;
    const identitySummary = `${profile.statistics.countryCount}개 나라 · ${profile.statistics.cityCount}개 도시 · ${profile.statistics.travelCount}개 Journey`;
    const description = sharedYear
      ? `${displayName}님이 ${sharedYear}년에 기록한 여행 동선과 기억을 지구본에서 만나보세요.`
      : `${identitySummary}. ${profile.bio ?? `${displayName}님의 여행 동선과 기억을 지구본에서 만나보세요.`}`;
    const image = {
      url: profileRecapImagePath(profile.username, sharedYear),
      width: 1200,
      height: 630,
      alt: sharedYear
        ? `${displayName}님의 ${sharedYear} 여행 세계 리캡`
        : `${displayName}님의 여행 세계 리캡`,
    };
    return {
      title,
      description,
      alternates: {
        canonical: sharedYear
          ? `${profilePath(profile.username)}?year=${sharedYear}`
          : profilePath(profile.username),
      },
      openGraph: {
        type: "website",
        locale: "ko_KR",
        siteName: siteConfig.name,
        title,
        description,
        url: sharedYear
          ? `${profilePath(profile.username)}?year=${sharedYear}`
          : profilePath(profile.username),
        images: [image],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [image],
      },
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

  const { profile, countries, travels, recapCustomizations } = data;
  const profileUrl = new URL(profilePath(profile.username), getSiteUrl()).toString();
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
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ProfilePage",
          name: `${publicDisplayName(profile.displayName)}의 여행 세계`,
          url: profileUrl,
          mainEntity: {
            "@type": "Person",
            name: publicDisplayName(profile.displayName),
            identifier: profile.username,
            description: profile.bio
              ?? `${profile.statistics.countryCount}개 나라와 ${profile.statistics.travelCount}개 Journey가 기록된 여행 세계`,
            image: profile.profileImageUrl ?? undefined,
          },
        }}
      />
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
          initialRecapCustomizations={recapCustomizations}
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
  const [loadedProfile, countries, travels, recapCustomizations] = await Promise.all([
    loadProfile(username),
    fetchVisitedCountries(username),
    loadTravels(username),
    // Old backend revisions do not expose this endpoint. Keep the profile usable
    // during the short frontend/backend rollout window and fall back to defaults.
    fetchProfileRecaps(username).catch(() => []),
  ]);
  return { profile: presentDemoProfile(loadedProfile), countries, travels, recapCustomizations };
}

/**
 * Rendered per request. A profile is live, personal data, and this also keeps
 * `next build` from needing the API to be running.
 */
export const dynamic = "force-dynamic";
