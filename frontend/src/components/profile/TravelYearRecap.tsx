"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { showFeedback } from "@/components/common/AppFeedback";
import { TravelImage } from "@/components/common/TravelImage";
import { RecapActions } from "@/components/profile/RecapActions";
import { ApiError, apiMutation } from "@/lib/api/client";
import { travelPath } from "@/lib/config";
import { formatDate } from "@/lib/utils/format";
import type { TravelRecap, TravelYearComparison } from "@/lib/travelInsights";
import type { ProfileRecapCustomization, TravelSummary } from "@/types";

interface TravelYearRecapProps {
  recap: TravelRecap;
  comparison: TravelYearComparison | null;
  username: string;
  displayName: string;
  isOwnProfile: boolean;
  availableTravels: TravelSummary[];
  customization: ProfileRecapCustomization | null;
  onCustomizationChange: (customization: ProfileRecapCustomization | null) => void;
}

const numberFormatter = new Intl.NumberFormat("ko-KR");

export function TravelYearRecap({
  recap,
  comparison,
  username,
  displayName,
  isOwnProfile,
  availableTravels,
  customization,
  onCustomizationChange,
}: TravelYearRecapProps) {
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftNarrative, setDraftNarrative] = useState(customization?.narrative ?? "");
  const [draftFeaturedIds, setDraftFeaturedIds] = useState<number[]>(
    customization?.featuredTravelIds ?? [],
  );
  const [saving, setSaving] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);
  const detailsId = useId();
  const editorId = useId();

  if (!recap.latestTravel) return null;

  const scopeLabel = recap.year ? `${recap.year}년` : "지금까지";
  const defaultNarrative = recap.distanceKm > 0
    ? recap.topCountry
      ? `${recap.topCountry.nameKo}을 ${recap.topCountryVisits}번 찾았고, ${numberFormatter.format(recap.distanceKm)}km의 여정이 세계에 남았습니다.`
      : `${numberFormatter.format(recap.distanceKm)}km의 여정이 세계에 남았습니다.`
    : recap.travelCount === 1
      ? "첫 Journey를 기록하며 나의 여행 세계를 시작했습니다."
      : `${recap.travelCount}번의 Journey가 나의 여행 세계에 기록되었습니다.`;
  const narrative = customization?.narrative || defaultNarrative;
  const busiestMonth = [...recap.monthSummaries].sort((left, right) => (
    right.travelCount - left.travelCount || right.travelDays - left.travelDays
  ))[0];
  const activeMonthCount = recap.monthSummaries.filter((month) => month.travelCount > 0).length;
  const maxMonthValue = Math.max(...recap.monthSummaries.map((month) => month.travelCount), 1);
  const comparisonNarrative = comparison ? buildComparisonNarrative(comparison) : null;
  const shareText = `${displayName}님의 ${scopeLabel} 여행 세계입니다. ${comparisonNarrative ?? narrative}`;

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
            shareText={shareText}
          />
          {isOwnProfile && recap.year ? (
            <button
              type="button"
              className="travel-recap__edit-trigger"
              aria-expanded={editorOpen}
              aria-controls={editorId}
              onClick={() => {
                if (!editorOpen) {
                  setDraftNarrative(customization?.narrative ?? "");
                  setDraftFeaturedIds(customization?.featuredTravelIds ?? []);
                }
                setEditorOpen(!editorOpen);
                setEditorError(null);
              }}
            >
              {editorOpen ? "편집 닫기" : "리캡 편집"}
            </button>
          ) : null}
        </div>
      </div>

      {isOwnProfile && recap.year && editorOpen ? (
        <form
          id={editorId}
          className="travel-recap-editor"
          onSubmit={async (event) => {
            event.preventDefault();
            setSaving(true);
            setEditorError(null);
            try {
              const saved = await apiMutation<ProfileRecapCustomization>(
                `/api/private/recaps/${recap.year}`,
                "PUT",
                { narrative: draftNarrative, featuredTravelIds: draftFeaturedIds },
              );
              if (saved) onCustomizationChange(saved);
              setEditorOpen(false);
              showFeedback("리캡을 저장했어요.", "success");
            } catch (error) {
              setEditorError(error instanceof ApiError ? error.message : "리캡을 저장하지 못했습니다.");
            } finally {
              setSaving(false);
            }
          }}
        >
          <div className="travel-recap-editor__heading">
            <div>
              <strong>{recap.year} 리캡 편집</strong>
              <p>한 문장과 대표 여행만 골라 내 리캡을 정리할 수 있어요.</p>
            </div>
            <span>{draftNarrative.length}/240</span>
          </div>
          <label className="travel-recap-editor__narrative">
            <span>리캡 한 문장</span>
            <textarea
              value={draftNarrative}
              maxLength={240}
              rows={3}
              placeholder={defaultNarrative}
              onChange={(event) => setDraftNarrative(event.target.value)}
            />
          </label>
          <fieldset>
            <legend>대표 여행 <small>최대 3개 · 선택하지 않으면 최근 여행을 자동 표시</small></legend>
            <div className="travel-recap-editor__travels">
              {availableTravels.map((travel) => {
                const selected = draftFeaturedIds.includes(travel.id);
                const selectionBlocked = !selected && draftFeaturedIds.length >= 3;
                return (
                  <label key={travel.id} className={selected ? "is-selected" : undefined}>
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={selectionBlocked}
                      onChange={() => setDraftFeaturedIds((current) => (
                        selected
                          ? current.filter((id) => id !== travel.id)
                          : [...current, travel.id]
                      ))}
                    />
                    <TravelImage
                      src={travel.coverImageUrl}
                      alt=""
                      fallbackLabel={travel.primaryCountry?.iso2Code}
                    />
                    <span>
                      <strong>{travel.title}</strong>
                      <small>{formatDate(travel.startDate)}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {editorError ? <p className="travel-recap-editor__error" role="alert">{editorError}</p> : null}
          <div className="travel-recap-editor__actions">
            {customization ? (
              <button
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setEditorError(null);
                  try {
                    await apiMutation(`/api/private/recaps/${recap.year}`, "DELETE");
                    onCustomizationChange(null);
                    setEditorOpen(false);
                    showFeedback("기본 리캡으로 되돌렸어요.", "success");
                  } catch (error) {
                    setEditorError(error instanceof ApiError ? error.message : "리캡을 초기화하지 못했습니다.");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                기본으로 되돌리기
              </button>
            ) : <span />}
            <button type="submit" disabled={saving}>{saving ? "저장 중…" : "저장"}</button>
          </div>
        </form>
      ) : null}

      <button
        type="button"
        className="travel-recap__details-toggle"
        aria-expanded={detailsExpanded}
        aria-controls={detailsId}
        onClick={() => setDetailsExpanded((current) => !current)}
      >
        <span>
          <small>여행 리듬 · 대표 도시 · 기억 장면</small>
          <strong>{detailsExpanded ? "리캡 접기" : "리캡 자세히 보기"}</strong>
        </span>
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 8 5 5 5-5" /></svg>
      </button>

      <div id={detailsId} className="travel-recap__details" hidden={!detailsExpanded}>
        <dl className="travel-recap__stats">
          <RecapStat label="여행" value={`${recap.travelCount}회`} />
          <RecapStat label="나라" value={`${recap.countryCount}개`} />
          <RecapStat label="여행한 날" value={`${numberFormatter.format(recap.travelDays)}일`} />
          <RecapStat
            label="이어진 거리"
            value={recap.distanceKm > 0 ? `${numberFormatter.format(recap.distanceKm)}km` : "—"}
          />
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
            <ul className="sr-only">
              {recap.monthSummaries.filter((month) => month.travelCount > 0).map((month) => (
                <li key={month.month}>
                  {month.month}월 여행 {month.travelCount}회, {month.travelDays}일, {month.countryCount}개 나라
                </li>
              ))}
            </ul>
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

        {comparison && comparisonNarrative ? (
          <section className="travel-recap__comparison" aria-labelledby="travel-recap-comparison-heading">
            <div className="travel-recap__comparison-intro">
              <p className="eyebrow">World comparison</p>
              <h3 id="travel-recap-comparison-heading">
                {comparison.previousYear}년과 {comparison.currentYear}년 비교
              </h3>
              <p>{comparisonNarrative}</p>
              {comparison.newCountries.length > 0 ? (
                <ul aria-label="새로 더해진 나라">
                  {comparison.newCountries.map((country) => (
                    <li key={country.iso2Code}>{country.nameKo}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <dl className="travel-recap__comparison-stats">
              <ComparisonStat label="여행" value={comparison.travelCountDelta} unit="회" />
              <ComparisonStat label="나라" value={comparison.countryCountDelta} unit="개" />
              <ComparisonStat label="여행한 날" value={comparison.travelDaysDelta} unit="일" />
              <ComparisonStat label="이어진 거리" value={comparison.distanceKmDelta} unit="km" />
            </dl>
          </section>
        ) : null}

        <div
          className={`travel-recap__memories travel-recap__memories--${recap.featuredTravels.length}`}
          aria-label={`${scopeLabel} 대표 여행 장면`}
        >
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

function ComparisonStat({ label, value, unit }: { label: string; value: number; unit: string }) {
  const formatted = numberFormatter.format(Math.abs(value));
  return (
    <div>
      <dt>{label}</dt>
      <dd className={value > 0 ? "is-positive" : value < 0 ? "is-negative" : undefined}>
        {value > 0 ? "+" : value < 0 ? "−" : ""}{formatted}{unit}
      </dd>
    </div>
  );
}

function buildComparisonNarrative(comparison: TravelYearComparison): string {
  const newCountryNames = comparison.newCountries
    .map((country) => country.nameKo)
    .join("·");
  if (comparison.newCountries.length > 0) {
    if (comparison.travelCountDelta > 0) {
      return `${comparison.previousYear}년보다 ${comparison.travelCountDelta}번 더 떠났고, 지구본에는 ${newCountryNames}의 기억이 새로 더해졌습니다.`;
    }
    if (comparison.travelCountDelta < 0) {
      return `${comparison.previousYear}년보다 여행 횟수는 ${Math.abs(comparison.travelCountDelta)}번 줄었지만, 지구본에는 ${newCountryNames}의 기억이 새로 더해졌습니다.`;
    }
    return `${comparison.previousYear}년과 같은 횟수로 여행하며 지구본에 ${newCountryNames}의 기억을 새로 더했습니다.`;
  }

  if (comparison.travelCountDelta > 0) {
    return `${comparison.previousYear}년보다 ${comparison.travelCountDelta}번 더 떠나 익숙한 나라의 기억을 이어갔습니다.`;
  }
  if (comparison.travelCountDelta < 0) {
    return `${comparison.previousYear}년보다 ${Math.abs(comparison.travelCountDelta)}번 적게 떠나며 익숙한 나라를 천천히 다시 보았습니다.`;
  }
  return `${comparison.previousYear}년과 같은 횟수로 여행하며 익숙한 나라의 기억을 이어갔습니다.`;
}
