import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col overflow-hidden">
        <section className="landing-hero site-shell relative grid min-h-[calc(100svh-3.5rem)] flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-4 lg:py-14">
          <div className="landing-copy relative z-10">
            <h1 className="landing-title text-content max-w-[13ch]">
              <span className="landing-title-line landing-title-line--one">다녀온 세계를</span>{" "}
              <span className="landing-title-line landing-title-line--two">하나의 지구본에.</span>
            </h1>

            <p className="text-body landing-reveal landing-reveal--body mt-8 max-w-[44ch] text-[1rem] sm:text-[1.05rem]">
              방문한 나라는 좌표로, 도시 사이의 이동은 경로로 남습니다. 사진과 메모를
              더할수록 지구본은 나만의 여행 이야기가 됩니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="landing-primary-cta group"
              >
                <span>내 지구본 시작하기</span>
                <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
              </Link>
            </div>

          </div>

          <LandingGlobePreview />
        </section>

        <section aria-labelledby="experience-heading" className="landing-experience site-shell">
          <div className="hairline grid gap-10 pt-12 md:grid-cols-[0.62fr_1.38fr] md:gap-16">
            <div>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                세 단계면 충분합니다.
              </h2>
            </div>

            <dl className="grid gap-8 sm:grid-cols-3">
              <Feature
                term="장소를 잇고"
                description="지도에서 도시와 장소를 찾아 방문 순서대로 경로를 만듭니다."
              />
              <Feature
                term="장면을 더하고"
                description="각 장소에 사진과 메모를 더해 그날의 이야기를 완성합니다."
              />
              <Feature
                term="세계를 공유하고"
                description="공개한 여행은 로그인 없이 볼 수 있는 나만의 주소로 전합니다."
              />
            </dl>
          </div>
        </section>
      </main>

      <SiteFooter compact />
    </>
  );
}

function Feature({ term, description }: { term: string; description: string }) {
  return (
    <div className="landing-feature">
      <dt className="text-content text-[0.9rem] font-medium">{term}</dt>
      <dd className="text-body mt-3 text-[0.86rem]">{description}</dd>
    </div>
  );
}
