"use client";

import { useEffect, useRef } from "react";
import { ActivityFeed } from "./ActivityFeed";
import type { ActivityEvent } from "@/types";

export function ActivityDisclosure({ events }: { events: ActivityEvent[] }) {
  const details = useRef<HTMLDetailsElement>(null);
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
  return <details className="studio-activity-disclosure" ref={details}>
    <summary>최근 활동 {events.length ? <span>{events.length}</span> : null}</summary>
    <ActivityFeed events={events} />
  </details>;
}
