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
          description={"주소가 바뀌었거나, 아직 만들어지지 않은 프로필일 수 있습니다."}
          action={{
            href: profilePath(siteConfig.demoUsername),
            label: `@${siteConfig.demoUsername} 지구본 보기`,
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
