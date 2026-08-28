import { RouteLoadingState } from "@/components/common/RouteLoadingState";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function StudioLoading() {
  return (
    <>
      <SiteHeader />
      <RouteLoadingState label="계획과 여행 기록을 불러오고 있어요" />
    </>
  );
}
