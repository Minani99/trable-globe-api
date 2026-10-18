"use client";

import { useEffect, useMemo, useState } from "react";

import {
  buildSkyscannerFlightUrl,
  findAirportByCode,
  formatAirportLabel,
  inferAirportCode,
  normalizeAirportCode,
  searchAirports,
  type AirportOption,
} from "@/lib/airports";
import type { TravelPlace } from "@/types";
import { AppIcon } from "@/components/common/AppIcon";

export function TravelPreparationHub({
  startDate,
  endDate,
  countryCode,
  destinationLabel,
  places,
}: {
  startDate: string;
  endDate: string;
  countryCode: string;
  destinationLabel: string;
  latitude: number;
  longitude: number;
  places: TravelPlace[];
}) {
  const inferredDestination = useMemo(() => inferAirportCode(
    places.flatMap((place) => [place.city?.nameKo, place.city?.nameEn]),
    countryCode,
  ), [countryCode, places]);
  const [origin, setOrigin] = useState("SEL");
  const [destination, setDestination] = useState(inferredDestination);
  const flightReady = origin.length === 3 && destination.length === 3;

  return (
    <section className="trip-preparation" aria-labelledby="trip-preparation-heading">
      <header className="trip-preparation__heading">
        <div><h2 id="trip-preparation-heading">항공권부터 준비하기</h2></div>
        <p>{formatDateRange(startDate, endDate)} · {destinationLabel}</p>
      </header>

      <div className="trip-preparation__grid">
        <article className="trip-action-card is-flight">
          <div className="trip-action-card__icon" aria-hidden="true"><AppIcon name="plane" /></div>
          <div className="trip-action-card__copy"><span>항공권</span><h3>항공권 검색</h3><p>여행 날짜에 맞춰 항공편을 찾아보세요.</p></div>
          <div className="trip-flight-route">
            <AirportSearchField label="출발" value={origin} onChange={setOrigin} placeholder="예: 서울, 인천공항" />

            <AirportSearchField label="도착" value={destination} onChange={setDestination} placeholder="예: 도쿄, 나리타" />
          </div>
          {flightReady ? <a className="trip-action-card__button" href={buildSkyscannerFlightUrl({ origin, destination, outboundDate: startDate, inboundDate: endDate })} target="_blank" rel="noreferrer">이 일정으로 항공권 찾기 </a> : <p className="trip-action-card__notice">출발·도착 공항의 영문 코드 3자리를 입력해 주세요.</p>}
          <small>검색은 버튼을 누를 때만 실행되며 예약은 스카이스캐너에서 진행됩니다. 공항 데이터: <a href="https://ourairports.com/data/" target="_blank" rel="noreferrer">OurAirports</a></small>
        </article>


      </div>
    </section>
  );
}

function AirportSearchField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: "출발" | "도착";
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
}) {
  const selectedAirport = findAirportByCode(value);
  const selectedLabel = selectedAirport ? formatAirportLabel(selectedAirport) : value;
  const [query, setQuery] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [catalogResults, setCatalogResults] = useState<AirportOption[]>([]);
  const localResults = useMemo(() => searchAirports(query === selectedLabel && value ? value : query), [query, selectedLabel, value]);
  const results = useMemo(() => {
    const unique = new Map<string, AirportOption>();
    [...localResults, ...catalogResults].forEach((airport) => unique.set(airport.code, airport));
    return [...unique.values()].slice(0, 8);
  }, [catalogResults, localResults]);
  const directCode = normalizeAirportCode(query);
  const canUseDirectCode = directCode.length === 3 && !results.some((airport) => airport.code === directCode);
  const listId = `airport-${label === "출발" ? "origin" : "destination"}-results`;

  useEffect(() => {
    const trimmed = query.trim();
    if (value || trimmed.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: trimmed, limit: "8" });
      fetch(`/api/airports/search?${params}`, { signal: controller.signal })
        .then(async (response) => {
          const body = await response.json() as { success: boolean; data: AirportOption[] | null };
          setCatalogResults(response.ok && body.success && body.data ? body.data : []);
        })
        .catch((error) => {
          if (!(error instanceof Error && error.name === "AbortError")) setCatalogResults([]);
        });
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, value]);

  function selectAirport(code: string, option?: AirportOption) {
    const airport = option ?? findAirportByCode(code);
    onChange(code);
    setQuery(airport ? formatAirportLabel(airport) : code);
    setCatalogResults([]);
    setOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  return (
    <div
      className="airport-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <label>
        <span>{label}</span>
        <span className="airport-search__input-wrap">
          <input
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setCatalogResults([]);
              onChange("");
              setOpen(true);
            }}
            role="combobox"
            aria-label={`${label} 공항 검색`}
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            placeholder={placeholder}
            autoComplete="off"
          />
          {value ? <b>{value}</b> : <AppIcon name="search" />}
        </span>
      </label>
      {open ? <div className="airport-search__popover" id={listId} role="listbox" aria-label={`${label} 공항 검색 결과`}>
        {results.length ? <ul>{results.map((airport) => <li key={airport.code}>
          <button type="button" role="option" aria-selected={value === airport.code} onMouseDown={(event) => event.preventDefault()} onClick={() => selectAirport(airport.code, airport)}>
            <span><strong>{airport.cityKo}</strong><small>{airport.airportKo} · {airport.countryKo}</small></span><b>{airport.code}</b>
          </button>
        </li>)}</ul> : null}
        {canUseDirectCode ? <button type="button" className="airport-search__direct" onMouseDown={(event) => event.preventDefault()} onClick={() => selectAirport(directCode)}><span>목록에 없는 공항 코드 사용</span><b>{directCode}</b></button> : null}
        {!results.length && !canUseDirectCode ? <p>도시, 공항명 또는 영문 코드로 검색해 주세요.</p> : null}
      </div> : null}
    </div>
  );
}

function formatDateRange(start: string, end: string): string {
  return start === end ? formatKoreanDate(start) : `${formatKoreanDate(start)} – ${formatKoreanDate(end)}`;
}

function formatKoreanDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return `${year}.${String(month).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}
