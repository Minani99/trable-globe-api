"use client";

import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { WorkspaceTabs } from "@/components/common/WorkspaceTabs";
import styles from "./TravelWorkspace.module.css";

const TABS = ["일정", "사진·메모", "여행 정보", "예산·예약", "준비물", "항공·날씨"] as const;
const HASHES = ["#travel-place-editor", "#travel-photo-editor", "#travel-info-editor", "#travel-budget", "#travel-checklist", "#travel-preparation"];
const EDITOR_SECTIONS = [1, 2, 0];

export const TravelWorkspaceContext = createContext<{
  section: number; selectSection: (section: number) => void; tabsId: string;
} | null>(null);

export function MobilePlanningWorkspace({ travelId, preparation, checklist, budget, editor }: {
  travelId: number; preparation: ReactNode; checklist: ReactNode; budget: ReactNode; editor: ReactNode;
}) {
  const [active, setActive] = useState(0);
  const tabsId = `trip-workspace-${travelId}`;
  useEffect(() => {
    function syncHash() {
      const hash = window.location.hash;
      const index = HASHES.indexOf(hash);
      if (index >= 0) setActive(index);
      else if (["#travel-editor", "#itinerary-editor", "#travel-note-editor"].includes(hash)) setActive(0);
    }
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);
  const select = useCallback((index: number) => {
    setActive(index);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${HASHES[index]}`);
    window.dispatchEvent(new Event("hashchange"));
  }, []);
  const selectSection = useCallback((section: number) => select(EDITOR_SECTIONS.indexOf(section)), [select]);
  const context = useMemo(() => ({ section: EDITOR_SECTIONS[active] ?? 1, selectSection, tabsId }), [active, selectSection, tabsId]);
  return (
    <section className={styles.workspace} aria-label="여행 계획 편집">
      <WorkspaceTabs id={tabsId} label="여행 작업" items={TABS} active={active} onChange={select} />
      <TravelWorkspaceContext.Provider value={context}>
        <div className={styles.panel} hidden={active > 2}>{editor}</div>
      </TravelWorkspaceContext.Provider>
      {[budget, checklist, preparation].map((panel, index) => (
        <div key={index} className={styles.panel} id={`${tabsId}-panel-${index + 3}`} role="tabpanel"
          aria-labelledby={`${tabsId}-tab-${index + 3}`} hidden={active !== index + 3}>{panel}</div>
      ))}
    </section>
  );
}
