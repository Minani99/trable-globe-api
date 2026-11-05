"use client";

import { useEffect, useRef, useState } from "react";
import { apiSessionGet } from "@/lib/api/client";
import { ActivityFeed } from "./ActivityFeed";
import type { ActivityEvent } from "@/types";

export function ActivityDisclosure() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!open || events !== null) return;
    const controller = new AbortController();
    void apiSessionGet<ActivityEvent[]>("/api/private/activity?limit=8", { signal: controller.signal })
      .then(value => {
        if (!Array.isArray(value)) throw new Error("Invalid activity response");
        if (!controller.signal.aborted) setEvents(value);
      })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [open, events, attempt]);
  useEffect(() => {
    function openActivity() {
      if (window.location.hash !== "#activity" || !details.current) return;
      details.current.open = true;
      details.current.scrollIntoView({ block: "start" });
    }
    openActivity();
    window.addEventListener("hashchange", openActivity);
    return () => window.removeEventListener("hashchange", openActivity);
  }, []);
  return <details className="studio-activity-disclosure" ref={details} onToggle={event => {
    setOpen(event.currentTarget.open);
    if (event.currentTarget.open) setFailed(false);
  }}>
    <summary>최근 활동 {events?.length ? <span>{events.length}</span> : null}</summary>
    {events ? <ActivityFeed events={events} /> : failed ? <div role="status">
      <p>최근 활동을 불러오지 못했어요.</p>
      <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>다시 확인</button>
    </div> : <p role="status">최근 활동을 불러오는 중…</p>}
  </details>;
}
