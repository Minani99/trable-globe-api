import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description: siteConfig.description,
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-[760px] flex-1 px-5 py-20 sm:px-8">
        <p className="eyebrow mb-5">About</p>
        <h1 className="text-heading text-content">
          여행 기록을 지도가 아니라 지구본으로 읽는 방법
        </h1>

        <div className="text-body mt-8 flex flex-col gap-5">
          <p>
            {siteConfig.name}은 한 사람이 다녀온 곳을 3D 지구본 위에 모아 두는 개인 여행
            아카이브입니다. 목록을 읽기 전에 지구본을 먼저 돌려보면서 &ldquo;이 사람은 어디를
            다녔지?&rdquo;라는 질문에 답할 수 있게 만드는 것이 목표입니다.
          </p>
          <p>
            국가를 선택하면 그 나라에서의 여행 기록으로 이어지고, 여행 하나를 열면 방문한 장소와
            사진, 그리고 그때의 메모를 볼 수 있습니다.
          </p>
          <p>
            현재는 첫 번째 단계로 공개 프로필 조회에 집중하고 있습니다. 회원가입과 여행 기록 작성,
            팔로우 같은 기능은 이후 단계에서 추가할 예정입니다.
          </p>
        </div>

        <p className="text-caption hairline mt-12 pt-6">
          {siteConfig.name}은 임시 서비스명입니다.
        </p>
      </main>

      <SiteFooter />
    </>
  );
}
