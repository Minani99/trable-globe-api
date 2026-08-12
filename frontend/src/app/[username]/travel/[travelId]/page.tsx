import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { StateMessage } from "@/components/common/StateMessage";
import { TravelImage } from "@/components/common/TravelImage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PhotoGallery } from "@/components/travel/PhotoGallery";
import { TravelRouteMap } from "@/components/travel/TravelRouteMap";
import { ApiError } from "@/lib/api/client";
import { fetchTravelDetail } from "@/lib/api/travel";
import { profilePath, travelPath } from "@/lib/config";
import { formatDate, formatDateRange, formatDuration } from "@/lib/utils/format";
import type { TravelDetail, TravelNavigationLink } from "@/types";

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
    return {
      title: travel.title,
      description: travel.description ?? `${travel.title} 여행 기록`,
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
  try {
    travel = await loadTravel(id);
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
            eyebrow="Connection error"
            title="여행 기록을 불러오지 못했습니다"
            description={
              error instanceof ApiError && error.isUnreachable
                ? "여행 기록을 잠시 불러오지 못했습니다.\n잠시 후 다시 열어 주세요."
                : "잠시 후 다시 열어 주세요."
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

  return (
    <>
      <SiteHeader username={travel.owner.username} />

      <main id="main" className="travel-detail-page flex-1">
        <article className="site-shell">
          <nav aria-label="현재 위치" className="travel-detail-breadcrumb">
            <Link href={profilePath(travel.owner.username)}>
              <span aria-hidden="true">←</span>
              {travel.owner.displayName}의 지구본
            </Link>
            <span aria-hidden="true">/</span>
            <span>여행 기록</span>
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
                <p className="eyebrow">Travel journal · {countryNames.join(" / ")}</p>
                <h1>{travel.title}</h1>
                <p className="travel-detail-hero__date">
                  {formatDateRange(travel.startDate, travel.endDate)}
                </p>
              </div>

              {travel.description ? (
                <p className="travel-detail-hero__description">{travel.description}</p>
              ) : (
                <p className="travel-detail-hero__description">
                  지도 위의 경로와 사진으로 다시 꺼내 보는 여행입니다.
                </p>
              )}

              <dl className="travel-detail-stats">
                <div>
                  <dt>Duration</dt>
                  <dd>{formatDuration(travel.durationDays)}</dd>
                </div>
                <div>
                  <dt>Stops</dt>
                  <dd>{String(travel.places.length).padStart(2, "0")}</dd>
                </div>
                <div>
                  <dt>Scenes</dt>
                  <dd>{String(travel.photos.length).padStart(2, "0")}</dd>
                </div>
              </dl>

              <a href="#route" className="travel-detail-hero__jump">
                여정 살펴보기
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </header>

          <section id="route" aria-labelledby="route-heading" className="travel-detail-section">
            <div className="travel-detail-section__heading">
              <div>
                <p className="eyebrow">Route &amp; itinerary</p>
                <h2 id="route-heading">여정을 따라가 보세요</h2>
              </div>
              <p>
                지도에서 방문 지점을 선택하거나 휠과 버튼으로 확대해 보세요. 장소 이름과 메모는
                오른쪽 일정에서 겹치지 않게 확인할 수 있습니다.
              </p>
            </div>

            {travel.places.length > 0 ? (
              <TravelRouteMap places={travel.places} countryCodes={countryCodes} />
            ) : (
              <div className="travel-detail-empty">아직 기록된 방문 장소가 없습니다.</div>
            )}
          </section>

          <section aria-labelledby="photos-heading" className="travel-detail-section">
            <div className="travel-detail-section__heading">
              <div>
                <p className="eyebrow">Scenes</p>
                <h2 id="photos-heading">여행의 장면들</h2>
              </div>
              <p>
                이동 순서와는 다른 리듬으로, 오래 기억하고 싶은 순간들을 모았습니다.
              </p>
            </div>
            <PhotoGallery photos={travel.photos} travelTitle={travel.title} />
          </section>

          <section className="travel-detail-more" aria-labelledby="more-travel-heading">
            <div>
              <p className="eyebrow">Keep exploring</p>
              <h2 id="more-travel-heading">다른 여행으로 이어보기</h2>
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
  const label = isPrevious ? "Previous journey" : "Next journey";
  const arrow = isPrevious ? "←" : "→";

  if (!travel) {
    return (
      <div className="travel-detail-nav-card is-empty" aria-disabled="true">
        <span className="travel-detail-nav-card__meta">{label}</span>
        <strong>{isPrevious ? "첫 번째 기록입니다" : "마지막 기록입니다"}</strong>
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
