"use client";

import { useEffect } from "react";

import { StateMessage } from "@/components/common/StateMessage";

/**
 * Last-resort boundary for a rendering failure inside the profile subtree.
 *
 * Expected API failures are handled in the page itself with a specific message; this
 * catches the unexpected ones and never shows the raw error to the visitor.
 */
export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Profile page failed to render", error);
  }, [error]);

  return (
    <div className="flex-1">
      <StateMessage
        variant="page"
        eyebrow="Something went wrong"
        title="화면을 표시하지 못했습니다"
        description="잠시 후 다시 시도해 주세요."
      />
      <div className="flex justify-center pb-16">
        <button
          type="button"
          onClick={reset}
          className="border-border-strong text-content-muted rounded-full border px-4 py-2 text-[0.8rem] transition-colors hover:border-[var(--accent-border)] hover:text-[var(--accent-strong)]"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
