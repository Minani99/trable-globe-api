/**
 * Date and number formatting shared across the UI.
 *
 * Everything is formatted with explicit parts rather than `toLocaleDateString`, so the
 * server-rendered markup and the client hydration always agree regardless of the
 * machine's locale.
 */

const MONTHS_SHORT = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
] as const;

interface DateParts {
  year: number;
  month: number;
  day: number;
}

/** Parses an ISO `yyyy-MM-dd` string without going through Date (no timezone shifting). */
function parseIsoDate(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) {
    return null;
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/** `2026.05.16` */
export function formatDate(value: string | null): string {
  const parts = value ? parseIsoDate(value) : null;
  if (!parts) {
    return "";
  }
  return `${parts.year}.${pad(parts.month)}.${pad(parts.day)}`;
}

/** `2026.05.16 — 2026.05.18`, collapsed to one date for a single-day trip. */
export function formatDateRange(start: string, end: string): string {
  const from = formatDate(start);
  const to = formatDate(end);
  return from === to ? from : `${from} — ${to}`;
}

/** `MAY` - the month label used down the timeline rail. */
export function formatMonthShort(value: string): string {
  const parts = parseIsoDate(value);
  return parts ? MONTHS_SHORT[parts.month - 1] : "";
}

export function getYear(value: string): number {
  return parseIsoDate(value)?.year ?? 0;
}

/** `04` - statistics read as a set, so single digits are padded. */
export function formatStat(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/** `3박 4일`, or `당일치기` for a same-day trip. */
export function formatDuration(durationDays: number): string {
  if (durationDays <= 1) {
    return "당일치기";
  }
  return `${durationDays - 1}박 ${durationDays}일`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}
