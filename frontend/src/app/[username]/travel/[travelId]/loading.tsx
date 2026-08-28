import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function TravelDetailLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1" aria-busy="true">
        <GlobeLoadingIndicator
          minimal
          className="min-h-[calc(100svh-3.75rem)] w-full"
          description="지도와 사진, 메모를 순서대로 준비하고 있어요."
        />
      </main>
    </>
  );
}
