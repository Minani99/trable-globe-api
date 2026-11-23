import { ANCHOR_MODES, BUILD_MODES, COMPANIONS, MAX_TRIP_DAYS, MOBILE_PLAN_STEPS, PACES, STYLES } from "./plan-builder-model";
import type { AnchorMode, BuildMode, Companion, Pace, Style } from "./plan-builder-model";

export interface PlanDraft {
  countryCode: string;
  region: string;
  startDate: string;
  tripDays: number;
  companion: Companion;
  styles: Style[];
  pace: Pace;
  buildMode: BuildMode;
  anchorMode: AnchorMode;
  anchorInput: string;
  mobileStep: number;
}

export function readPlanDraft(key: string): PlanDraft | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || typeof d.countryCode !== "string" || !/^(?:[A-Z]{2})?$/.test(d.countryCode)
      || typeof d.region !== "string" || typeof d.anchorInput !== "string"
      || typeof d.startDate !== "string" || (d.startDate !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(d.startDate))
      || !Number.isInteger(d.tripDays) || d.tripDays < 1 || d.tripDays > MAX_TRIP_DAYS
      || !Number.isInteger(d.mobileStep) || d.mobileStep < 0 || d.mobileStep >= MOBILE_PLAN_STEPS.length
      || !COMPANIONS.includes(d.companion) || !Array.isArray(d.styles) || d.styles.length > 3
      || !d.styles.every((style: Style) => STYLES.includes(style))
      || !PACES.some(p => p.id === d.pace) || !BUILD_MODES.some(m => m.id === d.buildMode)
      || !ANCHOR_MODES.some(m => m.id === d.anchorMode)) return null;
    return d;
  } catch {
    return null;
  }
}

export function writePlanDraft(key: string, draft: PlanDraft | null) {
  try {
    if (draft) sessionStorage.setItem(key, JSON.stringify(draft));
    else sessionStorage.removeItem(key);
  } catch {
    // The planner also works when browser storage is unavailable.
  }
}

/** Keep one snapshot for React hydration, keyboard edits and session recovery. */
export function createPlanDraftStore(key: string, defaults: PlanDraft) {
  const initial = { fields: defaults, restored: false };
  let snapshot: typeof initial | undefined;
  const listeners = new Set<() => void>();
  function getSnapshot() {
    if (!snapshot) {
      const saved = readPlanDraft(key);
      snapshot = saved ? { fields: saved, restored: true } : initial;
    }
    return snapshot;
  }
  return {
    getSnapshot,
    getServerSnapshot: () => initial,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    update(changes: Partial<PlanDraft>) {
      const current = getSnapshot();
      const fields = { ...current.fields, ...changes };
      snapshot = { ...current, fields };
      writePlanDraft(key, fields);
      listeners.forEach(listener => listener());
    },
  };
}
