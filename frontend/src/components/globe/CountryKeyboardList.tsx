"use client";

import { formatStat } from "@/lib/utils/format";
import type { VisitedCountry } from "@/types";

interface CountryKeyboardListProps {
  countries: VisitedCountry[];
  selectedCode: string | null;
  onSelect: (iso2Code: string | null) => void;
  onHover: (iso2Code: string | null) => void;
}

/**
 * The globe's content as a real list.
 *
 * A WebGL canvas cannot be made meaningfully accessible - there is no DOM for a screen
 * reader to read and no focus target for a marker. So every country on the globe is also
 * a button here, driving the same selection state. Keyboard and pointer users get the
 * same reach; the globe becomes the enhancement rather than the requirement.
 */
export function CountryKeyboardList({
  countries,
  selectedCode,
  onSelect,
  onHover,
}: CountryKeyboardListProps) {
  if (countries.length === 0) {
    return null;
  }

  return (
    <nav aria-label="방문한 국가 목록" className="w-full">
      <ul className="flex flex-wrap gap-2">
        {countries.map((country) => {
          const isSelected = country.iso2Code === selectedCode;
          return (
            <li key={country.iso2Code}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelect(isSelected ? null : country.iso2Code)}
                onMouseEnter={() => onHover(country.iso2Code)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(country.iso2Code)}
                onBlur={() => onHover(null)}
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[0.78rem] transition-colors ${
                  isSelected
                    ? "border-[var(--accent-border)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "border-border-subtle text-content-muted hover:border-border-strong hover:text-[var(--text-primary)]"
                }`}
              >
                <span>{country.nameKo}</span>
                <span className="text-content-faint font-mono text-[0.7rem]">
                  {formatStat(country.travelCount)}
                </span>
                <span className="sr-only">
                  여행 {country.travelCount}회, 도시 {country.cityCount}곳
                  {isSelected ? ", 선택됨" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
