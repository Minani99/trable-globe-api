"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import styles from "./WorkspaceTabs.module.css";

export function WorkspaceTabs({ id, label, items, active, onChange }: {
  id: string; label: string; items: readonly string[]; active: number; onChange: (index: number) => void;
}) {
  const tabsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container = tabsRef.current;
    const selected = container?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    if (!container || !selected) return;
    const reveal = () => {
      const frame = container.getBoundingClientRect();
      const tab = selected.getBoundingClientRect();
      const delta = tab.left < frame.left + 12 ? tab.left - frame.left - 12
        : tab.right > frame.right - 12 ? tab.right - frame.right + 12 : 0;
      if (delta) container.scrollBy({ left: delta, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
    };
    reveal();
    const observer = new ResizeObserver(reveal);
    observer.observe(container);
    return () => observer.disconnect();
  }, [active]);
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % items.length
      : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length
      : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    onChange(next);
    document.getElementById(`${id}-tab-${next}`)?.focus({ preventScroll: true });
  }
  return (
    <div ref={tabsRef} className={styles.tabs} role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button key={item} id={`${id}-tab-${index}`} type="button" role="tab"
          aria-selected={active === index} aria-controls={`${id}-panel-${index}`}
          tabIndex={active === index ? 0 : -1}
          onClick={() => onChange(index)} onKeyDown={(event) => navigate(event, index)}>{item}</button>
      ))}
    </div>
  );
}
