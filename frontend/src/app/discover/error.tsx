"use client";

import { RouteErrorState } from "@/components/common/RouteErrorState";

export default function DiscoverError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <RouteErrorState
      error={error}
      reset={reset}
      eyebrow="Discovery error"
      title="여행자를 찾지 못했어요"
      description="잠시 연결이 원활하지 않습니다. 다시 시도하면 검색과 추천을 이어갈 수 있어요."
    />
  );
}
