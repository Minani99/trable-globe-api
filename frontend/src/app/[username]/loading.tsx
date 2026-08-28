import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function ProfileLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1" aria-busy="true">
        <GlobeLoadingIndicator
          minimal
          className="min-h-[calc(100svh-3.75rem)] w-full"
          description="방문한 나라와 여행 기록을 함께 준비하고 있습니다"
        />
      </main>
    </>
  );
}
