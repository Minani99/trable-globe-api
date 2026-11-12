import Link from "next/link";
import type { ReactNode } from "react";

interface StateMessageProps {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  /** A second, quieter way out - e.g. browsing - so a dead end never has one exit only. */
  secondaryAction?: { href: string; label: string };
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
  secondaryAction,
  variant = "inline",
}: StateMessageProps) {
  // A full-page state is the page's main content, so its title is the page heading.
  const Heading = variant === "page" ? "h1" : "h2";
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-center ${
        variant === "page" ? "min-h-[60vh] px-6" : "border-border-subtle rounded-[16px] border border-dashed px-6 py-16"
      }`}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <Heading className={variant === "page" ? "text-heading text-content" : "text-title text-content"}>
        {title}
      </Heading>
      {description ? (
        <div className="text-body max-w-[46ch]">{description}</div>
      ) : null}
      {action || secondaryAction ? (
        <div className="state-message__actions mt-2 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <Link href={action.href} className="landing-secondary-cta">
              {action.label}
            </Link>
          ) : null}
          {secondaryAction ? (
            <Link href={secondaryAction.href} className="state-message__secondary">
              {secondaryAction.label}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
