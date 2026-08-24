"use client";

import { RouteErrorState } from "@/components/common/RouteErrorState";

export default function GlobeError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      eyebrow="Globe error"
      title="지구본을 열지 못했어요"
      description="여행 기록은 안전하게 보관되어 있습니다. 잠시 후 지구본을 다시 불러와 주세요."
    />
  );
}
