import { StateMessage } from "@/components/common/StateMessage";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <StateMessage
          variant="page"
          eyebrow="404"
          title="찾을 수 없는 페이지입니다"
          description={"요청한 여행이나 프로필을 찾을 수 없습니다. 주소를 한 번 더 확인해 주세요."}
          action={{
            href: profilePath(siteConfig.demoUsername),
            label: "공개 지구본으로 돌아가기",
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
