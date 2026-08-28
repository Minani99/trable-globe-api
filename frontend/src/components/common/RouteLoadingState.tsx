import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";

export function RouteLoadingState({ label = "여행 정보를 준비하고 있어요" }: { label?: string }) {
  return (
    <main id="main" className="route-state-page route-state-page--loading" aria-busy="true">
      <GlobeLoadingIndicator
        minimal
        className="min-h-[calc(100svh-3.75rem)] w-full"
        description={label}
      />
    </main>
  );
}
