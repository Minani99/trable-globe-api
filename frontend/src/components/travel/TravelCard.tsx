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
          <h3 className="text-title text-content transition-colors group-hover:text-[var(--accent-strong)]">
            {travel.title}
          </h3>
          <p className="text-content-faint mt-1.5 font-mono text-[0.72rem]">
            {formatDateRange(travel.startDate, travel.endDate)}
            <span className="mx-1.5">
              ·
            </span>
            {formatDuration(travel.durationDays)}
          </p>
          {travel.description ? (
            <p className="text-body mt-2.5 line-clamp-2 text-[0.85rem]">{travel.description}</p>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
