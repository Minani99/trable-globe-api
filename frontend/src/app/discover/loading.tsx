import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function DiscoverLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1" aria-busy="true">
        <GlobeLoadingIndicator
          minimal
          className="min-h-[calc(100svh-3.75rem)] w-full"
          description="여행자와 추천 목록을 불러오고 있습니다"
        />
      </main>
    </>
  );
}
