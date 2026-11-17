/**
 * Where a trip stands relative to today, in the words the hub shows.
 *
 * Dates are ISO calendar days (YYYY-MM-DD) in Korean time, the same convention as
 * `journeyGroups`, so the badge, the tab and the next-action card always agree.
 */
export type TripStage = "plan" | "travel" | "finish" | "record";

export interface TripTiming {
  stage: TripStage;
  /** Short status word for the trip list. */
  label: string;
  /** Countdown or progress, e.g. "D-14", "2/3일차". Null when nothing is counting. */
  badge: string | null;
}

/** Whole days from `from` to `to` (both ISO dates); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  const difference = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Number.isFinite(difference) ? Math.round(difference / 86_400_000) : 0;
}

export function tripTiming(
  startDate: string,
  endDate: string,
  visibility: "PUBLIC" | "PRIVATE" | string,
  today: string,
): TripTiming {
  if (startDate > today) {
    const days = daysBetween(today, startDate);
    return { stage: "plan", label: "계획 중", badge: `D-${days}` };
  }
  if (endDate >= today) {
    const total = daysBetween(startDate, endDate) + 1;
    const current = daysBetween(startDate, today) + 1;
    return { stage: "travel", label: "여행 중", badge: `${current}/${total}일차` };
  }
  // A finished trip that is still private has not been written up and published yet;
  // the hub's next action ("여행 기록하기") treats it the same way.
  return visibility === "PRIVATE"
    ? { stage: "finish", label: "기록 전", badge: null }
    : { stage: "record", label: "다녀온 여행", badge: null };
}
