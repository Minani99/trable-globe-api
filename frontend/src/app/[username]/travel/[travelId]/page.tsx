import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StateMessage } from "@/components/common/StateMessage";
import { TravelImage } from "@/components/common/TravelImage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PhotoGallery } from "@/components/travel/PhotoGallery";
import { JourneySummary } from "@/components/travel/JourneySummary";
import { TravelRouteMap } from "@/components/travel/TravelRouteMap";
import { SaveSharedItinerary } from "@/components/travel/SaveSharedItinerary";
import { TravelSocialPanel } from "@/components/travel/TravelSocialPanel";
import { ApiError } from "@/lib/api/client";
import { authenticatedBackendGet, getCurrentMember } from "@/lib/api/server-session";
import { fetchTravelDetail, fetchTravelSocial } from "@/lib/api/travel";
import { profilePath, travelPath } from "@/lib/config";
import { formatDate, formatDateRange, formatDuration } from "@/lib/utils/format";
import { todayInKorea } from "@/lib/utils/date";
import { publicDisplayName } from "@/lib/utils/profile";
import type { TravelDetail, TravelNavigationLink, TravelSocial } from "@/types";

const loadTravel = cache((travelId: number) => fetchTravelDetail(travelId));

export async function generateMetadata(
  props: PageProps<"/[username]/travel/[travelId]">,
): Promise<Metadata> {
  const { username, travelId } = await props.params;
  const id = Number(travelId);

  if (!Number.isInteger(id)) {
    return { title: "여행" };
  }

  try {
    const travel = await loadTravel(id);
    if (travel.owner.username !== username.toLowerCase()) {
      return { title: "여행" };
    }
    const countryLabel = travel.countries.map((country) => country.nameKo).join(" · ");
    return {
      title: countryLabel ? `${travel.title} · ${countryLabel}` : travel.title,
      description: travel.description
        ?? `${countryLabel || "여행지"}에서 보낸 ${formatDuration(travel.durationDays)} Journey`,
    };
  } catch {
    return { title: "여행" };
  }
}

export default async function TravelDetailPage(
  props: PageProps<"/[username]/travel/[travelId]">,
) {
  const { username, travelId } = await props.params;
  const id = Number(travelId);

  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  let travel: TravelDetail;
  let currentMember: Awaited<ReturnType<typeof getCurrentMember>> = null;
  try {
    [travel, currentMember] = await Promise.all([loadTravel(id), getCurrentMember()]);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) {
      notFound();
    }
    return (
      <>
        <SiteHeader username={username} />
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
            action={{ href: profilePath(username), label: "프로필로 돌아가기" }}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  if (travel.owner.username !== username.toLowerCase()) {
    notFound();
  }

  const countryCodes = travel.countries.map((country) => country.iso2Code);
  const countryNames = travel.countries.map((country) => country.nameKo);
  const cityNames = Array.from(
    new Set(
      travel.places
        .map((place) => place.city?.nameKo)
        .filter((name): name is string => Boolean(name)),
    ),
  );
  const locationLabel = cityNames.length > 0 ? cityNames.join(" → ") : countryNames.join(" · ");
  const emptySocial: TravelSocial = {
    likeCount: 0,
    likedByCurrentMember: false,
    commentCount: 0,
    comments: [],
  };
  const social = await (currentMember
    ? authenticatedBackendGet<TravelSocial>(`/api/private/travels/${id}/social`)
    : fetchTravelSocial(id)
  ).catch(() => null) ?? emptySocial;
  const ownerName = publicDisplayName(travel.owner.displayName);

  return (
    <>
      <SiteHeader username={travel.owner.username} member={currentMember} />

      <main id="main" className="travel-detail-page flex-1">
        <article className="site-shell">
          <nav aria-label="현재 위치" className="travel-detail-breadcrumb">
            <Link href={profilePath(travel.owner.username)}>
              <span aria-hidden="true">←</span>
              {ownerName}의 지구본
            </Link>
            <span aria-hidden="true">/</span>
            <span>Journey</span>
          </nav>

          <header className="travel-detail-hero">
            <div className="travel-detail-hero__media">
              <TravelImage
                src={travel.coverImageUrl}
                alt={`${travel.title} 대표 이미지`}
                fallbackLabel={countryCodes[0] ?? travel.title.slice(0, 2)}
                priority
                className="h-full w-full object-cover"
              />
              <div className="travel-detail-hero__veil" aria-hidden="true" />
              <div className="travel-detail-hero__location">
                <span>{countryCodes.join(" · ") || "TRIP"}</span>
                <strong>{locationLabel || "여행의 한 장면"}</strong>
              </div>
            </div>

            <div className="travel-detail-hero__content">
              <div>
                <p className="eyebrow">Journey · {countryNames.join(" / ")}</p>
                <h1>{travel.title}</h1>
                <p className="travel-detail-hero__date">
                  {formatDateRange(travel.startDate, travel.endDate)}
                </p>
              </div>

              {travel.description ? (
                <p className="travel-detail-hero__description">{travel.description}</p>
              ) : (
                <p className="travel-detail-hero__description">
                  지도 위의 경로와 사진을 따라 다시 걸어 보는 여행입니다.
                </p>
              )}

              <dl className="travel-detail-stats">
                <div>
                  <dt>여행 기간</dt>
                  <dd>{formatDuration(travel.durationDays)}</dd>
                </div>
                <div>
                  <dt>방문 장소</dt>
                  <dd>{String(travel.places.length).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>사진</dt>
                  <dd>{String(travel.photos.length).padStart(2, "0")}</dd>
                </div>
              </dl>

              <a href="#route" className="travel-detail-hero__jump">
                경로와 일정 보기
                <span aria-hidden="true">↓</span>
              </a>
              <SaveSharedItinerary travel={travel} signedIn={Boolean(currentMember)} isOwner={currentMember?.username === travel.owner.username} today={todayInKorea()} />
            </div>
          </header>

          <section id="route" aria-labelledby="route-heading" className="travel-detail-section">
            <div className="travel-detail-section__heading">
              <div>
                <p className="eyebrow">Route &amp; daily itinerary</p>
                <h2 id="route-heading">경로와 하루의 흐름</h2>
              </div>
              <p>
                지도에서 방문 지점을 선택하고, 확대하거나 이동해 보세요. 장소별 날짜와 메모는
                방문 순서에 맞춰 이어집니다.
              </p>
            </div>

            {travel.places.length > 0 ? (
              <TravelRouteMap key={travel.id} places={travel.places} />
            ) : (
              <div className="travel-detail-empty">아직 기록된 방문 장소가 없습니다.</div>
            )}
          </section>

          <section aria-labelledby="photos-heading" className="travel-detail-section">
            <div className="travel-detail-section__heading">
              <div>
                <p className="eyebrow">Memories</p>
                <h2 id="photos-heading">Journey의 장면</h2>
              </div>
              <p>경로의 순서에서 잠시 벗어나, 오래 남기고 싶은 순간만 모았습니다.</p>
            </div>
            <PhotoGallery photos={travel.photos} travelTitle={travel.title} />
          </section>

          <JourneySummary travel={travel} ownerName={ownerName} locationLabel={locationLabel} />

          <TravelSocialPanel
            travelId={travel.id}
            ownerUsername={travel.owner.username}
            currentMember={currentMember}
            initialSocial={social}
          />

          <section className="travel-detail-more" aria-labelledby="more-travel-heading">
            <div>
              <p className="eyebrow">More journeys</p>
              <h2 id="more-travel-heading">다음 여행을 이어서 보세요</h2>
            </div>
            <nav aria-label="이전·다음 여행" className="travel-detail-navigation">
              <TravelNavCard
                travel={travel.previousTravel}
                username={travel.owner.username}
                direction="previous"
              />
              <TravelNavCard
                travel={travel.nextTravel}
                username={travel.owner.username}
                direction="next"
              />
            </nav>
          </section>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}

function TravelNavCard({
  travel,
  username,
  direction,
}: {
  travel: TravelNavigationLink | null;
  username: string;
  direction: "previous" | "next";
}) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "이전 여행" : "다음 여행";
  const arrow = isPrevious ? "←" : "→";

  if (!travel) {
    return (
      <div className="travel-detail-nav-card is-empty" aria-disabled="true">
        <span className="travel-detail-nav-card__meta">{label}</span>
        <strong>{isPrevious ? "첫 여행입니다" : "가장 최근 여행입니다"}</strong>
        <span className="travel-detail-nav-card__arrow" aria-hidden="true">
          {arrow}
        </span>
      </div>
    );
  }

  return (
    <Link href={travelPath(username, travel.id)} className="travel-detail-nav-card">
      <span className="travel-detail-nav-card__meta">
        {label} · {formatDate(travel.startDate)}
      </span>
      <strong>{travel.title}</strong>
      <span className="travel-detail-nav-card__arrow" aria-hidden="true">
        {arrow}
      </span>
    </Link>
  );
}
