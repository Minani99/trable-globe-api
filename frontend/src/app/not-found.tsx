import { StateMessage } from "@/components/common/StateMessage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { globePath } from "@/lib/config";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <StateMessage
          variant="page"
          eyebrow="404"
          title="페이지를 찾을 수 없습니다"
          description="주소가 달라졌거나 공개되지 않은 여행일 수 있습니다."
          action={{
            href: globePath,
            label: "여행 지구본 보기",
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
