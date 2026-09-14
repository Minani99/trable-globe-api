import type { OwnedTravelSummary } from "@/types";

export type JourneyPhase = "travel" | "plan" | "record";
export interface JourneyNextAction {
  phase: JourneyPhase;
  trip: OwnedTravelSummary;
  label: string;
  href: string;
  description: string;
}

// Visibility is a sharing choice, not the stage of a journey. Use the same
// date boundaries and priority on the landing page, hub and quick capture.
export function journeyGroups(travels: OwnedTravelSummary[], today: string) {
  const latest = (a: OwnedTravelSummary, b: OwnedTravelSummary) =>
    (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0) || b.travel.id - a.travel.id;
  return {
    active: travels.filter(({ travel }) => travel.startDate <= today && today <= travel.endDate).sort(latest),
    plans: travels.filter(({ travel }) => travel.startDate > today)
      .sort((a, b) => a.travel.startDate.localeCompare(b.travel.startDate) || latest(a, b)),
    unfinished: travels.filter(({ travel, visibility }) => travel.endDate < today && visibility === "PRIVATE")
      .sort((a, b) => b.travel.endDate.localeCompare(a.travel.endDate) || latest(a, b)),
    records: travels.filter(({ travel, visibility }) => travel.endDate < today && visibility === "PUBLIC").sort(latest),
  };
}

export function nextJourneyAction(travels: OwnedTravelSummary[], today: string): JourneyNextAction | null {
  const { active, plans, unfinished } = journeyGroups(travels, today);
  if (active[0]) return {
    phase: "travel", trip: active[0], label: "오늘 일정 보기",
    href: `/studio/travels/${active[0].travel.id}/go?date=${today}`,
    description: "오늘 갈 장소를 확인하고 사진과 메모를 남기세요.",
  };
  if (plans[0]) return {
    phase: "plan", trip: plans[0], label: "이어서 계획하기",
    href: `/studio/travels/${plans[0].travel.id}/edit?plan=1`,
    description: "가까운 여행부터 준비하세요. 저장한 일정에서 이어집니다.",
  };
  if (unfinished[0]) return {
    phase: "record", trip: unfinished[0], label: "여행 기록하기",
    href: `/studio/travels/${unfinished[0].travel.id}/edit?finish=1`,
    description: "기존 일정에 사진과 메모를 더하세요. 공개 여부는 직접 선택합니다.",
  };
  return null;
}
