"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/common/Icon";
import { WorkspaceTabs } from "@/components/common/WorkspaceTabs";
import styles from "./TravelWorkspace.module.css";

// Tabs follow how a trip is usually prepared: book flights, pack, set the budget,
// then fill in the day-by-day itinerary.
const TABS = ["항공권", "준비물", "예산·예약", "일정", "사진·메모", "여행 정보"] as const;
const TAB_ICONS: readonly IconName[] = ["plane", "checklist", "wallet", "calendar", "photo", "note"];
const HASHES = ["#travel-preparation", "#travel-checklist", "#travel-budget", "#travel-place-editor", "#travel-photo-editor", "#travel-info-editor"];
const ITINERARY_TAB = 3;
const NEXT_STEP_LABELS = ["준비물 챙기기", "예산 정하기", "일정 짜기"];
// TravelEditor sections (0 info, 1 itinerary, 2 photos) shown by the editor tabs.
const EDITOR_TAB_SECTIONS: Record<number, number> = { 3: 1, 4: 2, 5: 0 };
const ITINERARY_HASHES = ["#travel-editor", "#itinerary-editor", "#travel-note-editor"];

export const TravelWorkspaceContext = createContext<{
  section: number; selectSection: (section: number) => void; tabsId: string; tabIndexForSection: (section: number) => number;
} | null>(null);

function tabIndexForSection(section: number): number {
  return Number(Object.entries(EDITOR_TAB_SECTIONS).find(([, value]) => value === section)?.[0] ?? ITINERARY_TAB);
}

export function MobilePlanningWorkspace({ travelId, preparation, checklist, budget, editor, startOnItinerary = false }: {
  travelId: number; preparation: ReactNode; checklist: ReactNode; budget: ReactNode; editor: ReactNode;
  /** Once the trip has started the itinerary matters more than bookings. */
  startOnItinerary?: boolean;
}) {
  const [active, setActive] = useState(startOnItinerary ? ITINERARY_TAB : 0);
  const workspaceRef = useRef<HTMLElement>(null);
  const tabsId = `trip-workspace-${travelId}`;
  useEffect(() => {
    function syncHash() {
      const hash = window.location.hash;
      const index = HASHES.indexOf(hash);
      if (index >= 0) setActive(index);
      else if (ITINERARY_HASHES.includes(hash) || hash.startsWith("#travel-place-editor")) setActive(ITINERARY_TAB);
      else if (hash.startsWith("#travel-photo-editor")) setActive(tabIndexForSection(2));
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  const select = useCallback((index: number) => {
    setActive(index);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${HASHES[index]}`);
    window.dispatchEvent(new Event("hashchange"));
    // Keep the workspace in view when switching from a long tab to a short one.
    const workspace = workspaceRef.current;
    const headerHeight = document.querySelector(".site-header")?.getBoundingClientRect().height ?? 56;
    if (workspace && workspace.getBoundingClientRect().top < headerHeight) {
      window.scrollTo({ top: window.scrollY + workspace.getBoundingClientRect().top - headerHeight - 8, behavior: "instant" });
    }
  }, []);
  const selectSection = useCallback((section: number) => select(tabIndexForSection(section)), [select]);
  const editorActive = active in EDITOR_TAB_SECTIONS;
  const context = useMemo(() => ({
    section: EDITOR_TAB_SECTIONS[active] ?? 1, selectSection, tabsId, tabIndexForSection,
  }), [active, selectSection, tabsId]);
  return (
    <section ref={workspaceRef} className={styles.workspace} aria-label="여행 계획 편집">
      <WorkspaceTabs id={tabsId} label="여행 작업" items={TABS} icons={TAB_ICONS} active={active} onChange={select} />
      {[preparation, checklist, budget].map((panel, index) => (
        <div key={index} className={styles.panel} id={`${tabsId}-panel-${index}`} role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${index}`} hidden={active !== index}>
          {panel}
          <button type="button" className={styles.next} onClick={() => select(index + 1)}>
            <span><small>다음 단계</small><strong>{NEXT_STEP_LABELS[index]}</strong></span>
            <Icon name="arrow-right" />
          </button>
        </div>
      ))}
      <TravelWorkspaceContext.Provider value={context}>
        <div className={styles.panel} hidden={!editorActive}>{editor}</div>
      </TravelWorkspaceContext.Provider>
    </section>
  );
}
