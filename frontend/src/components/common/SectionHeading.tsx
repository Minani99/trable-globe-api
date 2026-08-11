import type { ReactNode } from "react";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  /** Rendered on the right - a count, a filter chip, a link. */
  aside?: ReactNode;
  id?: string;
}

export function SectionHeading({ eyebrow, title, aside, id }: SectionHeadingProps) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 id={id} className="text-heading text-content">
          {title}
        </h2>
      </div>
      {aside ? <div className="flex items-center gap-3">{aside}</div> : null}
    </div>
  );
}
