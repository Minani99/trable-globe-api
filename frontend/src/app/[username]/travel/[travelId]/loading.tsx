import { StateMessage } from "@/components/common/StateMessage";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function TravelDetailLoading() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1" aria-busy="true">
        <StateMessage
          variant="page"
          eyebrow="Journey loading"
          title="여행의 장면을 불러오고 있습니다"
          description="지도와 사진, 메모를 순서대로 준비하고 있어요."
        />
      </main>
    </>
  );
}
