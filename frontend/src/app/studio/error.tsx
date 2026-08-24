"use client";

import { RouteErrorState } from "@/components/common/RouteErrorState";

export default function StudioError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      eyebrow="Travel hub error"
      title="계획을 불러오지 못했어요"
      description="작성한 내용은 그대로 보관되어 있습니다. 연결을 확인한 뒤 다시 시도해 주세요."
    />
  );
}
