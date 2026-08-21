import Link from "next/link";

import { TravelImage } from "@/components/common/TravelImage";
import { RecapActions } from "@/components/profile/RecapActions";
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
  const busiestMonth = [...recap.monthSummaries].sort((left, right) => (
    right.travelCount - left.travelCount || right.travelDays - left.travelDays
  ))[0];
  const activeMonthCount = recap.monthSummaries.filter((month) => month.travelCount > 0).length;
  const maxMonthValue = Math.max(...recap.monthSummaries.map((month) => month.travelCount), 1);

  return (
    <section className="travel-recap" aria-labelledby="travel-recap-heading">
      <div className="travel-recap__heading">
        <div>
          <p className="eyebrow">World recap</p>
          <h2 id="travel-recap-heading">{scopeLabel}, 내가 만든 여행 세계</h2>
        </div>
        <div className="travel-recap__summary">
          <p>{narrative}</p>
          <RecapActions
            displayName={displayName}
            username={username}
            year={recap.year}
          />
        </div>
      </div>

      <dl className="travel-recap__stats">
        <RecapStat label="여행" value={`${recap.travelCount}회`} />
        <RecapStat label="나라" value={`${recap.countryCount}개`} />
        <RecapStat label="여행한 날" value={`${numberFormatter.format(recap.travelDays)}일`} />
        <RecapStat label="이어진 거리" value={`${numberFormatter.format(recap.distanceKm)}km`} />
      </dl>

      <div className="travel-recap__insights">
        <section aria-labelledby="travel-recap-months-heading" className="travel-recap__rhythm">
          <div className="travel-recap__insight-heading">
            <div>
              <p className="eyebrow">Travel rhythm</p>
              <h3 id="travel-recap-months-heading">
                {recap.year ? "그해의 여행 리듬" : "계절마다 쌓인 여행 리듬"}
              </h3>
            </div>
            <p>
              {busiestMonth?.travelCount
                ? `${busiestMonth.month}월 · 여행 ${busiestMonth.travelCount}회, ${busiestMonth.travelDays}일`
                : "아직 월별 기록이 없습니다."}
            </p>
          </div>
          <div
            className="travel-recap__month-chart"
            role="img"
            aria-label={`${activeMonthCount}개 월에 여행 기록이 있습니다.`}
          >
            {recap.monthSummaries.map((month) => (
              <span key={month.month} className={month.travelCount ? "is-active" : undefined}>
                <i
                  style={{ height: `${month.travelCount ? Math.max(24, (month.travelCount / maxMonthValue) * 100) : 6}%` }}
                  title={`${month.month}월: 여행 ${month.travelCount}회, ${month.travelDays}일, ${month.countryCount}개 나라`}
                />
                <small>{month.month}</small>
              </span>
            ))}
          </div>
        </section>

        <section aria-labelledby="travel-recap-cities-heading" className="travel-recap__cities">
          <div className="travel-recap__insight-heading">
            <div>
              <p className="eyebrow">City memories</p>
              <h3 id="travel-recap-cities-heading">기억이 쌓인 대표 도시</h3>
            </div>
            <p>각 여행의 대표 도시를 기준으로 모았습니다.</p>
          </div>
          {recap.cityHighlights.length > 0 ? (
            <ol>
              {recap.cityHighlights.map((city, index) => (
                <li key={city.id}>
                  <Link href={travelPath(username, city.latestTravelId)}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <span>
                      <strong>{city.nameKo || city.nameEn}</strong>
                      <small>{city.countryNameKo ?? city.nameEn}</small>
                    </span>
                    <span>{city.visitCount}회 · {city.travelDays}일</span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <p className="travel-recap__cities-empty">
              여행에 대표 도시를 더하면 이곳에 도시별 기억이 모입니다.
            </p>
          )}
        </section>
      </div>

      <div className="travel-recap__memories" aria-label={`${scopeLabel} 대표 여행 장면`}>
        {recap.featuredTravels.map((travel, index) => (
          <Link key={travel.id} href={travelPath(username, travel.id)}>
            <TravelImage
              src={travel.coverImageUrl}
              alt={`${travel.title} 대표 이미지`}
              fallbackLabel={travel.primaryCountry?.iso2Code}
              className="travel-recap__memory-image"
            />
            <span className="travel-recap__memory-shade" aria-hidden="true" />
            <span className="travel-recap__memory-copy">
              <small>
                {index === 0
                  ? recap.year ? "그해 마지막 장면" : "가장 최근 장면"
                  : travel.primaryCountry?.nameKo ?? "여행의 한 장면"}
              </small>
              <strong>{travel.title}</strong>
              <small>{formatDate(travel.startDate)} · 사진 {travel.photoCount}장</small>
            </span>
          </Link>
        ))}
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
