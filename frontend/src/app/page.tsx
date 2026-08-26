import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOrientationGuide } from "@/components/landing/LandingOrientationGuide";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
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
              <span className="landing-title-line landing-title-line--one">계획한 여행이</span>{" "}
              <span className="landing-title-line landing-title-line--two">나의 세계가 됩니다.</span>
            </h1>

            <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
              여행을 계획하고, 여행 중에는 가볍게 체크하세요. 다녀온 뒤에는 같은 일정을
              다시 쓰지 않고 나만의 지구본 기록으로 완성할 수 있습니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <LandingStartAction />
              <LandingOrientationGuide />
            </div>

            <p className="landing-start-hint">처음이라면 여행 계획부터 시작하면 됩니다.</p>

          </div>

          <LandingGlobePreview />
        </section>

        <section aria-labelledby="experience-heading" className="landing-experience site-shell">
          <div className="hairline grid gap-10 pt-12 md:grid-cols-[0.62fr_1.38fr] md:gap-16">
            <div>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                계획과 기록이 끊기지 않습니다.
              </h2>
            </div>

            <dl className="grid gap-8 sm:grid-cols-3">
              <Feature
                term="딸깍, 계획하고"
                description="나라·날짜·취향을 선택하면 일차별 여행 뼈대가 자동으로 만들어집니다."
              />
              <Feature
                term="여행하며 체크하고"
                description="오늘 일정만 가볍게 확인하고, 실제로 간 장소와 사진을 바로 더합니다."
              />
              <Feature
                term="그대로 기록하고"
                description="여행이 끝나면 다시 쓰지 않고 계획을 기록으로 바꿔 지구본에 남깁니다."
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
      <dt className="text-content text-[0.94rem] font-semibold">{term}</dt>
      <dd className="text-body mt-2.5 text-[0.88rem]">{description}</dd>
    </div>
  );
}
