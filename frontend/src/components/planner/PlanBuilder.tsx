"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { showFeedback } from "@/components/common/AppFeedback";
import { ApiError, apiMutation } from "@/lib/api/client";
import type { CountryOption } from "@/lib/countries";
import type { TravelDetail, TravelWriteInput } from "@/types";

const COMPANIONS = ["혼자", "연인과", "친구와", "가족과"] as const;
const STYLES = ["맛집", "여유", "도시 산책", "자연", "쇼핑", "문화"] as const;
const PACES = [
  { id: "slow", label: "느긋하게", description: "하루 2~3곳" },
  { id: "balanced", label: "균형 있게", description: "하루 3~4곳" },
  { id: "full", label: "알차게", description: "하루 5곳 안팎" },
] as const;
const POPULAR_COUNTRIES = ["JP", "TW", "TH", "VN", "US", "FR", "IT", "ES"];

export function PlanBuilder({ countries, today, initialCountryCode = "" }: { countries: CountryOption[]; today: string; initialCountryCode?: string }) {
  const router = useRouter();
  const countryMap = useMemo(
    () => new Map(countries.map((country) => [country.iso2Code, country])),
    [countries],
  );
  const popularCountries = POPULAR_COUNTRIES
    .map((code) => countryMap.get(code))
    .filter((country): country is CountryOption => Boolean(country));
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [startDate, setStartDate] = useState(today);
  const [tripDays, setTripDays] = useState(4);
  const [companion, setCompanion] = useState<(typeof COMPANIONS)[number]>("친구와");
  const [styles, setStyles] = useState<Array<(typeof STYLES)[number]>>(["맛집", "여유"]);
  const [pace, setPace] = useState<(typeof PACES)[number]["id"]>("balanced");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedCountry = countryMap.get(countryCode);
  const endDate = addDays(startDate, tripDays - 1);

  function toggleStyle(style: (typeof STYLES)[number]) {
    setStyles((current) => current.includes(style)
      ? current.filter((item) => item !== style)
      : current.length < 3 ? [...current, style] : current);
  }

  async function createPlan() {
    if (!selectedCountry) {
      setError("먼저 여행할 나라를 골라 주세요.");
      return;
    }
    if (!startDate) {
      setError("출발일을 선택해 주세요.");
      return;
    }

    setPending(true);
    setError(null);
    const paceLabel = PACES.find((item) => item.id === pace)?.label ?? "균형 있게";
    const payload: TravelWriteInput = {
      title: `${selectedCountry.nameKo} ${tripDays}일 여행`,
      description: `${companion} 떠나는 ${styles.join(" · ") || "자유로운"} 여행 · ${paceLabel}`,
      startDate,
      endDate,
      coverImageUrl: null,
      visibility: "PRIVATE",
      places: Array.from({ length: tripDays }, (_, index) => ({
        country: {
          iso2Code: selectedCountry.iso2Code,
          iso3Code: selectedCountry.iso3Code,
          nameEn: selectedCountry.nameEn,
          nameKo: selectedCountry.nameKo,
          latitude: selectedCountry.latitude,
          longitude: selectedCountry.longitude,
        },
        city: null,
        placeName: `${index + 1}일차 · 장소를 골라주세요`,
        latitude: selectedCountry.latitude,
        longitude: selectedCountry.longitude,
        visitedAt: addDays(startDate, index),
        memo: `${styles.join(" · ") || "하고 싶은 것"} 중심으로 ${paceLabel} 채워보세요.`,
      })),
      photos: [],
    };

    try {
      const result = await apiMutation<TravelDetail>("/api/private/travels", "POST", payload);
      if (!result) throw new ApiError(500, "만든 계획을 확인할 수 없습니다.");
      showFeedback("일차별 여행 계획을 만들었습니다. 장소만 골라 채워보세요.", "success");
      router.push(`/studio/travels/${result.id}/edit?plan=1`);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "여행 계획을 만들지 못했습니다.");
      setPending(false);
    }
  }

  return (
    <div className="plan-builder">
      <div className="plan-builder__main">
        <section className="plan-step" aria-labelledby="plan-country-heading">
          <div className="plan-step__heading"><span>01</span><div><p className="eyebrow">Destination</p><h2 id="plan-country-heading">어디로 떠날까요?</h2></div></div>
          <label className="plan-country-select">
            <span className="sr-only">여행할 나라</span>
            <select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setError(null); }}>
              <option value="">나라를 검색하거나 선택하세요</option>
              {countries.map((country) => <option key={country.iso2Code} value={country.iso2Code}>{country.label}</option>)}
            </select>
          </label>
          <div className="plan-choice-row" aria-label="인기 여행지">
            {popularCountries.map((country) => (
              <button key={country.iso2Code} type="button" className={countryCode === country.iso2Code ? "is-selected" : ""} onClick={() => { setCountryCode(country.iso2Code); setError(null); }}>
                {country.nameKo}
              </button>
            ))}
          </div>
        </section>

        <section className="plan-step" aria-labelledby="plan-date-heading">
          <div className="plan-step__heading"><span>02</span><div><p className="eyebrow">When</p><h2 id="plan-date-heading">언제, 며칠 동안 갈까요?</h2></div></div>
          <div className="plan-date-row">
            <label><span>출발일</span><input type="date" min={today} value={startDate} onChange={(event) => { setStartDate(event.target.value); setError(null); }} /></label>
            <div><span>여행 기간</span><div className="plan-choice-row is-compact">{[1, 2, 3, 4, 5, 7].map((days) => <button key={days} type="button" className={tripDays === days ? "is-selected" : ""} onClick={() => setTripDays(days)}>{days === 1 ? "당일" : `${days - 1}박 ${days}일`}</button>)}</div></div>
          </div>
        </section>

        <section className="plan-step" aria-labelledby="plan-style-heading">
          <div className="plan-step__heading"><span>03</span><div><p className="eyebrow">Mood</p><h2 id="plan-style-heading">누구와, 어떤 여행인가요?</h2></div></div>
          <div className="plan-option-group"><span>동행</span><div className="plan-choice-row">{COMPANIONS.map((item) => <button key={item} type="button" className={companion === item ? "is-selected" : ""} onClick={() => setCompanion(item)}>{item}</button>)}</div></div>
          <div className="plan-option-group"><span>취향 · 최대 3개</span><div className="plan-choice-row">{STYLES.map((item) => <button key={item} type="button" className={styles.includes(item) ? "is-selected" : ""} onClick={() => toggleStyle(item)} aria-pressed={styles.includes(item)}>{item}</button>)}</div></div>
          <div className="plan-pace-grid">{PACES.map((item) => <button key={item.id} type="button" className={pace === item.id ? "is-selected" : ""} onClick={() => setPace(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
        </section>
      </div>

      <aside className="plan-summary" aria-label="여행 계획 요약">
        <p className="eyebrow">Your next world</p>
        <span className="plan-summary__number">{selectedCountry ? selectedCountry.iso2Code : "––"}</span>
        <h2>{selectedCountry ? `${selectedCountry.nameKo} 여행` : "다음 여행을 골라보세요"}</h2>
        <dl>
          <div><dt>일정</dt><dd>{startDate ? `${formatPlanDate(startDate)} → ${formatPlanDate(endDate)}` : "미정"}</dd></div>
          <div><dt>기간</dt><dd>{tripDays - 1}박 {tripDays}일</dd></div>
          <div><dt>분위기</dt><dd>{styles.length ? styles.join(" · ") : "자유롭게"}</dd></div>
          <div><dt>일정표</dt><dd>{tripDays}일치 자동 생성</dd></div>
        </dl>
        <div className="plan-summary__promise"><span aria-hidden="true">✓</span><p><strong>빈 템플릿 없이 시작</strong>일차별 뼈대와 체크 포인트를 먼저 만들어 드려요.</p></div>
        {error ? <p className="plan-builder__error" role="alert">{error}</p> : null}
        <button type="button" className="plan-summary__submit" onClick={createPlan} disabled={pending}>
          {pending ? "계획 만드는 중…" : "딸깍, 여행 계획 만들기"}<span aria-hidden="true">→</span>
        </button>
        <small>계획은 나에게만 보이며, 다녀온 뒤 기록으로 공개할 수 있어요.</small>
      </aside>

      <div className="plan-builder__mobile-submit" aria-live="polite">
        <span>
          <small>{selectedCountry ? selectedCountry.nameKo : "여행지를 선택해 주세요"}</small>
          <strong>{tripDays === 1 ? "당일 여행" : `${tripDays - 1}박 ${tripDays}일`} · {styles.length ? styles.join(" · ") : "자유롭게"}</strong>
        </span>
        <button type="button" onClick={createPlan} disabled={pending}>
          {pending ? "만드는 중…" : "계획 만들기"}
        </button>
      </div>
    </div>
  );
}

function addDays(date: string, amount: number): string {
  if (!date) return "";
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + amount));
  return next.toISOString().slice(0, 10);
}

function formatPlanDate(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}.${String(day).padStart(2, "0")}`;
}
