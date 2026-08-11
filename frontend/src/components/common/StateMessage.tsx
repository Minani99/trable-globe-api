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
 * One component for all three so the wording stays calm and consistent - the product has
 * no authoring flow yet, so these states must not push a call to action that goes nowhere.
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
      <h2 className="text-title text-content">{title}</h2>
      {description ? (
        <div className="text-body max-w-[46ch] whitespace-pre-line">{description}</div>
      ) : null}
      {action ? (
        <Link
          href={action.href}
          className="border-border-strong text-content mt-2 rounded-full border px-4 py-2 text-[0.8rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
