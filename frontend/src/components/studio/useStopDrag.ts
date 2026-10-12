"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

/** Capture on the handle leaves normal touch scrolling available everywhere else. */
export function useStopDrag(onMove: (from: string, to: string) => void) {
  const [drag, setDrag] = useState<{ from: string; to: string } | null>(null);
  const session = useRef<{ from: string; to: string; y: number; list: HTMLElement; frame: number } | null>(null);
  useEffect(() => () => { if (session.current) cancelAnimationFrame(session.current.frame); }, []);

  function cancel() {
    if (session.current) cancelAnimationFrame(session.current.frame);
    session.current = null;
    setDrag(null);
  }

  function start(event: PointerEvent<HTMLButtonElement>, key: string) {
    if (event.button !== 0 || !event.isPrimary || session.current) return;
    const list = event.currentTarget.closest("ol");
    if (!list) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
    session.current = { from: key, to: key, y: event.clientY, list, frame: 0 };
    setDrag({ from: key, to: key });
    const tick = () => {
      const current = session.current;
      if (!current) return;
      const edge = 100;
      const step = current.y < edge ? -10 : current.y > window.innerHeight - edge ? 10 : 0;
      if (step) window.scrollBy({ top: step, behavior: "instant" });
      const rows = [...current.list.querySelectorAll<HTMLElement>("[data-stop-key]")];
      const target = rows.reduce<HTMLElement | null>((nearest, row) => {
        const rect = row.getBoundingClientRect();
        const previous = nearest?.getBoundingClientRect();
        return !previous || Math.abs(current.y - (rect.top + rect.height / 2)) < Math.abs(current.y - (previous.top + previous.height / 2)) ? row : nearest;
      }, null)?.dataset.stopKey;
      if (target && target !== current.to) {
        current.to = target;
        setDrag({ from: current.from, to: target });
      }
      current.frame = requestAnimationFrame(tick);
    };
    session.current.frame = requestAnimationFrame(tick);
  }

  return {
    drag,
    cancel,
    start,
    move: (event: PointerEvent<HTMLButtonElement>) => { if (session.current) session.current.y = event.clientY; },
    finish: () => {
      const current = session.current;
      if (current && current.from !== current.to) onMove(current.from, current.to);
      cancel();
    },
  };
}
