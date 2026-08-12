import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description: siteConfig.description,
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="mx-auto w-full max-w-[920px] flex-1 px-5 py-20 sm:px-8 sm:py-28">
        <header className="max-w-[760px]">
          <p className="eyebrow mb-5">Why a globe</p>
          <h1 className="text-heading text-content max-w-[18ch] text-[clamp(2rem,5vw,3.4rem)]">
            여행을 소비한 장소가 아니라, 살아온 세계로 남깁니다.
          </h1>
          <p className="text-body mt-8 max-w-[62ch] text-[1rem]">
            {siteConfig.name}은 다녀온 곳과 그날의 이야기를 3D 지구본에 모으는 개인 여행
            아카이브입니다. 여행이 끝난 뒤에도 내가 건너온 나라와 도시를 한눈에 펼쳐보고, 한
            장면씩 다시 들어갈 수 있도록 만들고 있습니다.
          </p>
        </header>

        <section aria-labelledby="now-heading" className="hairline mt-16 grid gap-8 pt-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Available now</p>
            <h2 id="now-heading" className="text-title text-content">
              지금 할 수 있는 것
            </h2>
          </div>
          <ul className="text-body grid gap-4 text-[0.9rem]">
            <li>방문한 나라와 여행 횟수를 3D 지구본에서 둘러보기</li>
            <li>나라를 선택해 그곳의 여행 기록만 모아보기</li>
            <li>여행별 경로, 방문 장소, 사진과 메모 되짚기</li>
            <li>공개 프로필 주소로 나의 여행 세계 공유하기</li>
          </ul>
        </section>

        <section aria-labelledby="next-heading" className="hairline mt-14 grid gap-8 pt-10 md:grid-cols-2">
          <div>
            <p className="eyebrow mb-3">Next chapters</p>
            <h2 id="next-heading" className="text-title text-content">
              다음에 더할 것
            </h2>
          </div>
          <p className="text-body text-[0.9rem]">
            현재는 공개 아카이브를 읽는 경험에 집중한 첫 버전입니다. 다음 단계에서는 로그인과
            여행 작성, 사진 업로드, 공개 범위 설정을 더해 누구나 자신의 지구본을 만들 수 있도록
            확장할 예정입니다.
          </p>
        </section>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <Link
            href={profilePath(siteConfig.demoUsername)}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-[0.85rem] font-semibold text-[#130a06] transition-colors hover:bg-[var(--accent-strong)]"
          >
            샘플 지구본 둘러보기
          </Link>
          <Link href="/" className="text-content-muted px-3 py-2 text-[0.84rem] hover:text-[var(--text-primary)]">
            처음으로 돌아가기
          </Link>
        </div>

        <p className="text-caption hairline mt-16 pt-6">{siteConfig.name}은 현재 개발 중인 서비스입니다.</p>
      </main>

      <SiteFooter />
    </>
  );
}
