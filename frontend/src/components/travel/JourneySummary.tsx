import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { profilePath } from "@/lib/config";
import { formatDuration } from "@/lib/utils/format";
import type { TravelDetail } from "@/types";

interface JourneySummaryProps {
  travel: TravelDetail;
  ownerName: string;
  locationLabel: string;
}

export function JourneySummary({ travel, ownerName, locationLabel }: JourneySummaryProps) {
  const journeyActions = [
    travel.places.length > 0 ? `${travel.places.length}곳을 지나` : null,
    travel.photos.length > 0 ? `${travel.photos.length}장의 장면을 남긴` : null,
  ].filter((fact): fact is string => Boolean(fact));

  return (
    <section className="journey-summary" aria-labelledby="journey-summary-heading">
      <div className="journey-summary__copy">
        <p className="eyebrow">Journey summary</p>
        <h2 id="journey-summary-heading">이 Journey가 {ownerName}님의 세계에 남았습니다.</h2>
        <p>
          {locationLabel || "여행지"}에서 {formatDuration(travel.durationDays)} 동안 {journeyActions.join(" ") || "기억을 쌓은"} Journey입니다.
          {travel.photos.length === 0 ? " 사진이 없어도 경로와 장소의 기억은 그대로 이어집니다." : ""}
        </p>
      </div>

      <Link href={profilePath(travel.owner.username)} className="journey-summary__world-link">
        <TravelImage
          src={travel.owner.profileImageUrl}
          alt=""
          fallbackLabel={travel.owner.username.slice(0, 2)}
          className="journey-summary__avatar"
        />
        <span>
          <small>Explore this world</small>
          <strong>{ownerName}의 여행 세계</strong>
        </span>
        <i aria-hidden="true">→</i>
      </Link>
    </section>
  );
}
