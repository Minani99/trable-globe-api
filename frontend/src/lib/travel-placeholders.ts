/**
 * Marker used by the planner for a slot whose real place is not chosen yet
 * (e.g. "1일차 · 장소를 골라주세요").
 *
 * Must stay in sync with `TravelPlanningPlaceholder.MARKER` on the backend, which refuses
 * to publish a trip that still contains a placeholder.
 */
export const PLACEHOLDER_PLACE_MARKER = "골라주세요";

export function isPlaceholderPlaceName(value: string | null | undefined): boolean {
  const name = value?.trim() ?? "";
  return !name || name.includes(PLACEHOLDER_PLACE_MARKER);
}
