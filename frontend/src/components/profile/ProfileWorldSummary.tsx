import Link from "next/link";

import type { TravelRecap } from "@/lib/travelInsights";
import { formatStat } from "@/lib/utils/format";

interface ProfileWorldSummaryProps {
  recap: TravelRecap;
  isOwnProfile: boolean;
  cityCount: number;
}

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function ProfileWorldSummary({ recap, isOwnProfile, cityCount }: ProfileWorldSummaryProps) {
  const narrative = buildWorldSummaryNarrative(recap);

  return (
    <section className="profile-world-summary" aria-labelledby="profile-world-summary-heading">
      <div className="profile-world-summary__copy">
        <p className="eyebrow">My world</p>
        <h2 id="profile-world-summary-heading">
          {recap.year ? `${recap.year}년의 여행 세계` : "여행으로 만들어진 나의 세계"}
        </h2>
        <p>{narrative}</p>
        {recap.travelCount === 0 && isOwnProfile ? (
          <Link href="/studio/travels/new">첫 Journey 만들기</Link>
        ) : null}
      </div>

      <dl className="profile-world-summary__stats">
        <WorldStat label="Countries" value={formatStat(recap.countryCount)} />
        <WorldStat label="Cities" value={formatStat(cityCount)} />
        <WorldStat label="Journeys" value={formatStat(recap.travelCount)} />
        <WorldStat
          label="Distance"
          value={recap.distanceKm > 0 ? numberFormatter.format(recap.distanceKm) : "—"}
          unit={recap.distanceKm > 0 ? "km" : undefined}
        />
      </dl>
    </section>
  );
}

export function buildWorldSummaryNarrative(recap: TravelRecap): string {
  if (recap.travelCount === 0) {
    return "아직 기록된 여행이 없습니다. 첫 여행을 기록하면 이곳에 당신의 세계가 만들어집니다.";
  }
  if (recap.distanceKm === 0 && recap.travelCount === 1) {
    return "첫 여행 기록을 시작했습니다.";
  }
  if (recap.travelCount === 1) {
    return "첫 번째 Journey가 이 세계에 기록되었습니다.";
  }
  if (recap.distanceKm === 0) {
    return `${recap.travelCount}번의 Journey가 이 세계에 기록되었습니다.`;
  }
  return `${numberFormatter.format(recap.distanceKm)}km의 여행이 이 세계에 기록되었습니다.`;
}

function WorldStat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {value}
        {unit ? <small>{unit}</small> : null}
      </dd>
    </div>
  );
}
