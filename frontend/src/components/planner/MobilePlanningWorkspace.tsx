"use client";

import { useEffect, useState, type ReactNode } from "react";

const WORKSPACE_STEPS = ["항공·날씨", "준비물", "예산·예약", "일정·기록"] as const;
const WORKSPACE_HASHES = ["#travel-preparation", "#travel-checklist", "#travel-budget", "#travel-editor"] as const;
const EDITOR_HASHES = ["#travel-editor", "#itinerary-editor", "#travel-place-editor", "#travel-photo-editor", "#travel-note-editor"];

type MobilePlanningWorkspaceProps = {
  travelId: number;
  preparation: ReactNode;
  checklist: ReactNode;
  budget: ReactNode;
  editor: ReactNode;
};

export function MobilePlanningWorkspace({ travelId, preparation, checklist, budget, editor }: MobilePlanningWorkspaceProps) {
  const [activeStep, setActiveStep] = useState(0);
  const panels = [preparation, checklist, budget, editor];
  const storageKey = `travel-globe:planning-step:${travelId}`;

  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash;
      const step = EDITOR_HASHES.some((editorHash) => hash.startsWith(editorHash))
        ? 3
        : WORKSPACE_HASHES.findIndex((workspaceHash) => hash.startsWith(workspaceHash));
      if (step >= 0) {
        setActiveStep(step);
        window.localStorage.setItem(storageKey, String(step));
      }
    };
    window.addEventListener("hashchange", syncHash);
    if (window.location.hash) {
      syncHash();
    } else if (window.matchMedia("(max-width: 700px)").matches) {
      const restoredStep = Number(window.localStorage.getItem(storageKey));
      if (Number.isInteger(restoredStep) && restoredStep > 0 && restoredStep < WORKSPACE_STEPS.length) {
        replaceHash(WORKSPACE_HASHES[restoredStep]);
      }
    }
    return () => window.removeEventListener("hashchange", syncHash);
  }, [storageKey]);

  const moveTo = (nextStep: number) => {
    const boundedStep = Math.max(0, Math.min(WORKSPACE_STEPS.length - 1, nextStep));
    setActiveStep(boundedStep);
    window.localStorage.setItem(storageKey, String(boundedStep));
    replaceHash(WORKSPACE_HASHES[boundedStep]);
    window.requestAnimationFrame(() => {
      document.getElementById("mobile-planning-workspace-progress")?.scrollIntoView({ block: "start" });
    });
  };

  return (
    <section
      className="mobile-planning-workspace"
      aria-label="여행 계획 편집"
      data-mobile-editor={activeStep === 3 ? "true" : "false"}
    >
      <header id="mobile-planning-workspace-progress" className="mobile-planning-workspace__progress">
        <div>
          <span>{String(activeStep + 1).padStart(2, "0")} / {String(WORKSPACE_STEPS.length).padStart(2, "0")}</span>
          <strong>{WORKSPACE_STEPS[activeStep]}</strong>
        </div>
        <span
          role="progressbar"
          aria-label="여행 준비 진행률"
          aria-valuemin={1}
          aria-valuemax={WORKSPACE_STEPS.length}
          aria-valuenow={activeStep + 1}
        >
          <i style={{ width: `${((activeStep + 1) / WORKSPACE_STEPS.length) * 100}%` }} />
        </span>
      </header>

      {panels.map((panel, index) => (
        <div
          className={`mobile-planning-workspace__panel${index === 3 ? " is-editor" : ""}`}
          data-mobile-active={activeStep === index ? "true" : "false"}
          key={WORKSPACE_STEPS[index]}
        >
          {index === 3 ? (
            <button className="mobile-planning-workspace__return" type="button" onClick={() => moveTo(2)}>
              ← 준비·예산으로 돌아가기
            </button>
          ) : null}
          {panel}
        </div>
      ))}

      {activeStep < 3 ? (
        <nav className="mobile-planning-workspace__nav" aria-label="여행 준비 단계 이동">
          <button className="is-previous" type="button" disabled={activeStep === 0} onClick={() => moveTo(activeStep - 1)}>
            이전
          </button>
          <span><small>{activeStep + 1} / {WORKSPACE_STEPS.length}</small><strong>{WORKSPACE_STEPS[activeStep]}</strong></span>
          <button className="is-next" type="button" onClick={() => moveTo(activeStep + 1)}>
            다음
          </button>
        </nav>
      ) : null}
    </section>
  );
}

function replaceHash(hash: string) {
  if (window.location.hash === hash) return;
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  window.dispatchEvent(new Event("hashchange"));
}
