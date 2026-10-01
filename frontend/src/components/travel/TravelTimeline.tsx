import Link from "next/link";

import { travelPath } from "@/lib/config";
import { formatMonthLabel, getYear } from "@/lib/utils/format";
import type { TravelSummary } from "@/types";

interface TravelTimelineProps {
  travels: TravelSummary[];
  username: string;
}

interface TimelineYear {
  year: number;
  travels: TravelSummary[];
}

/**
 * Trips grouped by year, newest first.
 *
 * Grouping happens here rather than in the API so that a year filter can later be added
 * as a prop without a new endpoint.
 */
export function TravelTimeline({ travels, username }: TravelTimelineProps) {
  const years = groupByYear(travels);

  if (years.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-10">
      {years.map((group) => (
        <section key={group.year} aria-labelledby={`timeline-${group.year}`}>
          <h3
            id={`timeline-${group.year}`}
            className="text-content-faint mb-4 text-[0.95rem] font-semibold tabular-nums"
          >
            {group.year}
          </h3>

          <ol className="border-border-subtle flex flex-col border-l">
            {group.travels.map((travel) => (
              <li key={travel.id} className="relative">
                <span
                  aria-hidden="true"
                  className="bg-background border-accent absolute top-[1.15rem] -left-[4.5px] h-2 w-2 rounded-full border"
                />
                <Link
                  href={travelPath(username, travel.id)}
                  className="hover:bg-surface/60 group flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-r-md py-3 pr-3 pl-6 transition-colors"
                >
                  <span className="text-content-faint w-10 shrink-0 text-xs tabular-nums">
                    {formatMonthLabel(travel.startDate)}
                  </span>
                  <span className="text-content text-[0.92rem] transition-colors group-hover:text-[var(--accent-strong)]">
                    {travel.title}
                  </span>
                  <span className="text-content-faint text-[0.76rem]">
                    {[travel.primaryCity?.nameKo, travel.primaryCountry?.nameKo]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function groupByYear(travels: TravelSummary[]): TimelineYear[] {
  const byYear = new Map<number, TravelSummary[]>();

  travels.forEach((travel) => {
    const year = getYear(travel.startDate);
    const bucket = byYear.get(year);
    if (bucket) {
      bucket.push(travel);
    } else {
      byYear.set(year, [travel]);
    }
  });

  return [...byYear.entries()]
    .sort(([a], [b]) => b - a)
    .map(([year, yearTravels]) => ({ year, travels: yearTravels }));
}
