import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { travelPath } from "@/lib/config";
import { formatDateRange, formatDuration } from "@/lib/utils/format";
import type { TravelSummary } from "@/types";

interface TravelCardProps {
  travel: TravelSummary;
  username: string;
  /** The first card on a page is above the fold, so its cover loads eagerly. */
  priority?: boolean;
}

export function TravelCard({ travel, username, priority }: TravelCardProps) {
  const place = [travel.primaryCountry?.nameKo, travel.primaryCity?.nameKo]
    .filter(Boolean)
    .join(" · ");
  const extraCountries = travel.countries.length - 1;

  return (
    <article className="travel-card group">
      <Link
        href={travelPath(username, travel.id)}
        className="focus-visible:outline-accent-strong block h-full"
      >
        <div className="travel-card__media relative aspect-[4/3] w-full overflow-hidden">
          <TravelImage
            src={travel.coverImageUrl}
            alt={`${travel.title} 대표 이미지`}
            fallbackLabel={travel.primaryCountry?.iso2Code}
            priority={priority}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
          />
          <p className="absolute right-3 bottom-3 left-3 font-mono text-[0.68rem] tracking-[0.12em] text-white/80 uppercase">
            {place}
            {extraCountries > 0 ? ` +${extraCountries}` : ""}
          </p>
        </div>

        <div className="travel-card__body">
          <p className="travel-card__date">{formatDateRange(travel.startDate, travel.endDate)}</p>
          <h3 className="text-title text-content transition-colors group-hover:text-[var(--accent-strong)]">
            {travel.title}
          </h3>
          <dl className="travel-card__facts" aria-label={`${travel.title} 여행 요약`}>
            <div><dt>기간</dt><dd>{formatDuration(travel.durationDays)}</dd></div>
            <div><dt>장소</dt><dd>{String(travel.placeCount).padStart(2, "0")}</dd></div>
            <div><dt>사진</dt><dd>{travel.photoCount > 0 ? String(travel.photoCount).padStart(2, "0") : "—"}</dd></div>
          </dl>
          <span className="travel-card__open" aria-hidden="true">Journey 열기 <i>→</i></span>
        </div>
      </Link>
    </article>
  );
}
