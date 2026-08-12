import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { SectionHeading } from "@/components/common/SectionHeading";
import { StateMessage } from "@/components/common/StateMessage";
import { TravelImage } from "@/components/common/TravelImage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { PhotoGallery } from "@/components/travel/PhotoGallery";
import { TravelPlaceList } from "@/components/travel/TravelPlaceList";
import { TravelRouteMap } from "@/components/travel/TravelRouteMap";
import { ApiError } from "@/lib/api/client";
import { fetchTravelDetail } from "@/lib/api/travel";
import { profilePath, travelPath } from "@/lib/config";
import { formatDateRange, formatDuration } from "@/lib/utils/format";
import type { TravelDetail } from "@/types";

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
                ? "API 서버에 연결할 수 없습니다.\n백엔드가 실행 중인지 확인해 주세요."
                : "잠시 후 다시 시도해 주세요."
            }
            action={{ href: profilePath(username), label: "프로필로 돌아가기" }}
          />
        </main>
        <SiteFooter />
      </>
    );
  }

  // The trip is addressed by id, so the handle in the URL has to match its real owner -
  // otherwise any username would render someone else's trip under their profile.
  if (travel.owner.username !== username.toLowerCase()) {
    notFound();
  }

  const countryCodes = travel.countries.map((country) => country.iso2Code);
  const locationLine = [
    travel.countries.map((country) => country.nameKo).join(", "),
    travel.places[0]?.city?.nameKo,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SiteHeader username={travel.owner.username} />

      <main id="main" className="flex-1">
        {/* Hero */}
        <div className="relative h-[46vh] max-h-[520px] min-h-[280px] w-full overflow-hidden">
          <TravelImage
            src={travel.coverImageUrl}
            alt={`${travel.title} 대표 이미지`}
            fallbackLabel={countryCodes[0]}
            priority
            className="h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/45 to-transparent"
          />
        </div>

        <article className="mx-auto w-full max-w-[840px] px-5 sm:px-8">
          <header className="relative -mt-24 pb-12">
            <p className="eyebrow mb-4">{locationLine}</p>
            <h1 className="text-display text-content text-[clamp(2rem,4.6vw,3.2rem)]">
              {travel.title}
            </h1>
            <p className="text-content-muted mt-4 font-mono text-[0.82rem]">
              {formatDateRange(travel.startDate, travel.endDate)}
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              {formatDuration(travel.durationDays)}
              <span className="mx-2" aria-hidden="true">
                ·
              </span>
              장소 {travel.places.length}곳
            </p>

            <Link
              href={profilePath(travel.owner.username)}
              className="text-content-faint mt-6 inline-flex items-center gap-2 text-[0.8rem] transition-colors hover:text-[var(--accent-strong)]"
            >
              <span aria-hidden="true">←</span>
              {travel.owner.displayName}의 지구본으로
            </Link>
          </header>

          {travel.description ? (
            <p className="text-body hairline pt-10 text-[1rem] leading-[1.85] whitespace-pre-line">
              {travel.description}
            </p>
          ) : null}

          {travel.places.length > 0 ? (
            <section aria-labelledby="route-heading" className="pt-16">
              <SectionHeading id="route-heading" eyebrow="Route" title="여행 경로" />
              <TravelRouteMap places={travel.places} countryCodes={countryCodes} />
            </section>
          ) : null}

          <section aria-labelledby="places-heading" className="pt-16">
            <SectionHeading
              id="places-heading"
              eyebrow="Itinerary"
              title="방문 장소"
              aside={
                <span className="text-content-faint font-mono text-[0.78rem]">
                  {travel.places.length} places
                </span>
              }
            />
            <TravelPlaceList places={travel.places} />
          </section>

          <section aria-labelledby="photos-heading" className="pt-16">
            <SectionHeading
              id="photos-heading"
              eyebrow="Gallery"
              title="사진"
              aside={
                <span className="text-content-faint font-mono text-[0.78rem]">
                  {travel.photos.length} photos
                </span>
              }
            />
            <PhotoGallery photos={travel.photos} travelTitle={travel.title} />
          </section>

          <nav aria-label="이전 다음 여행" className="hairline mt-20 grid grid-cols-2 gap-4 pt-8">
            <TravelNavLink
              travel={travel.previousTravel}
              username={travel.owner.username}
              direction="previous"
            />
            <TravelNavLink
              travel={travel.nextTravel}
              username={travel.owner.username}
              direction="next"
            />
          </nav>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}

function TravelNavLink({
  travel,
  username,
  direction,
}: {
  travel: TravelDetail["previousTravel"];
  username: string;
  direction: "previous" | "next";
}) {
  const isPrevious = direction === "previous";
  const label = isPrevious ? "이전 여행" : "다음 여행";

  if (!travel) {
    return (
      <div className={isPrevious ? "" : "text-right"}>
        <p className="eyebrow mb-2">{label}</p>
        <p className="text-content-faint text-[0.85rem]">없음</p>
      </div>
    );
  }

  return (
    <Link
      href={travelPath(username, travel.id)}
      className={`group block ${isPrevious ? "" : "text-right"}`}
    >
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-content text-[0.92rem] transition-colors group-hover:text-[var(--accent-strong)]">
        {travel.title}
      </p>
    </Link>
  );
}
