import Link from "next/link";
import type { ReactNode } from "react";

interface StateMessageProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  /** `page` centres the block in a tall area; `inline` sits inside a section. */
  variant?: "page" | "inline";
}

/**
 * Shared empty / error / not-found block.
 *
 * One component for all three so wording, spacing and recovery actions stay consistent.
 */
export function StateMessage({
  eyebrow,
  title,
  description,
  action,
  variant = "inline",
}: StateMessageProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        variant === "page" ? "min-h-[60vh] px-6" : "border-border-subtle rounded-[16px] border border-dashed px-6 py-16"
      }`}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2 className={variant === "page" ? "text-heading text-content" : "text-title text-content"}>
        {title}
      </h2>
      {description ? (
        <div className="text-body max-w-[46ch]">{description}</div>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="landing-secondary-cta mt-2"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
