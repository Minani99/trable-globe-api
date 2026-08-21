import Link from "next/link";

import { ShareProfileButton } from "@/components/profile/ShareProfileButton";
import { travelPath } from "@/lib/config";
import { formatDate } from "@/lib/utils/format";
import type { TravelRecap } from "@/lib/travelInsights";

interface TravelYearRecapProps {
  recap: TravelRecap;
  username: string;
  displayName: string;
}

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function TravelYearRecap({ recap, username, displayName }: TravelYearRecapProps) {
  if (!recap.latestTravel) return null;

  const scopeLabel = recap.year ? `${recap.year}년` : "지금까지";
  const narrative = recap.topCountry
    ? `${recap.topCountry.nameKo}을 ${recap.topCountryVisits}번 찾았고, ${numberFormatter.format(recap.distanceKm)}km의 선이 지구본에 이어졌습니다.`
    : `${numberFormatter.format(recap.distanceKm)}km의 여정이 지구본 위에 이어졌습니다.`;

  return (
    <section className="travel-recap" aria-labelledby="travel-recap-heading">
      <div className="travel-recap__heading">
        <div>
          <p className="eyebrow">World recap</p>
          <h2 id="travel-recap-heading">{scopeLabel}, 내가 만든 여행 세계</h2>
        </div>
        <div className="travel-recap__summary">
          <p>{narrative}</p>
          <ShareProfileButton
            displayName={displayName}
            selectedYear={recap.year}
            variant="recap"
          />
        </div>
      </div>

      <dl className="travel-recap__stats">
        <RecapStat label="여행" value={`${recap.travelCount}회`} />
        <RecapStat label="나라" value={`${recap.countryCount}개`} />
        <RecapStat label="여행한 날" value={`${numberFormatter.format(recap.travelDays)}일`} />
        <RecapStat label="이어진 거리" value={`${numberFormatter.format(recap.distanceKm)}km`} />
      </dl>

      <div className="travel-recap__memories">
        {recap.longestTravel ? (
          <Link href={travelPath(username, recap.longestTravel.id)}>
            <span>가장 오래 머문 여행</span>
            <strong>{recap.longestTravel.title}</strong>
            <small>{recap.longestTravel.durationDays}일 · {formatDate(recap.longestTravel.startDate)}</small>
          </Link>
        ) : null}
        <Link href={travelPath(username, recap.latestTravel.id)}>
          <span>{recap.year ? "그해 마지막 기억" : "가장 최근의 기억"}</span>
          <strong>{recap.latestTravel.title}</strong>
          <small>{formatDate(recap.latestTravel.startDate)} · 사진 {recap.latestTravel.photoCount}장</small>
        </Link>
      </div>
    </section>
  );
}

function RecapStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
