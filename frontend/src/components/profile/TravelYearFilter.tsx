interface TravelYearFilterProps {
  years: number[];
  selectedYear: number | null;
  onChange: (year: number | null) => void;
}

export function TravelYearFilter({ years, selectedYear, onChange }: TravelYearFilterProps) {
  if (years.length < 2) return null;

  return (
    <div className="travel-year-filter" role="group" aria-label="여행 연도 필터">
      <span className="travel-year-filter__label">나의 여행 세계</span>
      <label className="travel-year-filter__mobile">
        <span>여행 연도</span>
        <select
          value={selectedYear ?? "all"}
          onChange={(event) => onChange(event.target.value === "all" ? null : Number(event.target.value))}
        >
          <option value="all">전체 기록</option>
          {years.map((year) => <option key={year} value={year}>{year}년</option>)}
        </select>
      </label>
      <div className="travel-year-filter__options">
        <button
          type="button"
          className={selectedYear === null ? "is-active" : undefined}
          aria-pressed={selectedYear === null}
          onClick={() => onChange(null)}
        >
          전체
        </button>
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={selectedYear === year ? "is-active" : undefined}
            aria-pressed={selectedYear === year}
            onClick={() => onChange(year)}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  );
}
