"use client";

import type { KeyboardEvent } from "react";
import styles from "./WorkspaceTabs.module.css";

export function WorkspaceTabs({ id, label, items, active, onChange }: {
  id: string; label: string; items: readonly string[]; active: number; onChange: (index: number) => void;
}) {
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % items.length
      : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  }
  return (
    <div className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button key={item} id={`${id}-tab-${index}`} type="button" role="tab"
          aria-selected={active === index} aria-controls={`${id}-panel-${index}`}
          tabIndex={active === index ? 0 : -1}
          onClick={() => onChange(index)} onKeyDown={(event) => navigate(event, index)}>{item}</button>
      ))}
    </div>
  );
}
