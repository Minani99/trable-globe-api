import { GlobeLoadingIndicator } from "@/components/globe/GlobeLoadingIndicator";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function GlobeEntryLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex min-h-[calc(100svh-3.5rem)] flex-1 items-center justify-center">
        <GlobeLoadingIndicator
          minimal
          className="min-h-[420px] w-full"
          description="로그인 상태와 여행 기록을 확인하고 있습니다"
        />
      </main>
    </>
  );
}
