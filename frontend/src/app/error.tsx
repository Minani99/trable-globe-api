"use client";

import { RouteErrorState } from "@/components/common/RouteErrorState";

/**
 * Catches unexpected errors on pages without their own boundary (settings, sign-in,
 * shared links, the landing page) while keeping the site's layout. `global-error.tsx`
 * remains the last resort for failures in the root layout itself.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      eyebrow="Unexpected error"
      title="화면을 불러오지 못했어요"
      description="잠시 연결이 불안정했을 수 있어요. 다시 시도하거나 홈으로 이동해 주세요."
    />
  );
}
