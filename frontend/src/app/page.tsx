import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOrientationGuide } from "@/components/landing/LandingOrientationGuide";
import { LandingOverview } from "@/components/landing/LandingOverview";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

export default function LandingPage() {
  const sampleWorldPath = profilePath(siteConfig.demoUsername);

  return (
    <>
      <SiteHeader />

      <main id="main" className="landing-main flex flex-1 flex-col overflow-hidden">
        <section aria-labelledby="landing-title" className="landing-hero site-shell relative grid min-h-[calc(100svh-3.5rem)] flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-4 lg:py-14">
          <div className="landing-copy relative z-10">
            <p className="landing-kicker landing-reveal landing-reveal--eyebrow">
              PLAN · TRAVEL · RECORD
            </p>
            <h1 id="landing-title" className="landing-title text-content max-w-[13ch]">
              <span className="landing-title-line landing-title-line--one">여행 계획부터</span>{" "}
              <span className="landing-title-line landing-title-line--two">기록까지, 한곳에서.</span>
            </h1>

            <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
              나라와 날짜를 고르고 일정을 만드세요. 다녀온 뒤에는 같은 계획을 여행 기록과
              지구본에 바로 남길 수 있습니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <LandingStartAction />
              <Link href={sampleWorldPath} className="landing-secondary-cta">
                샘플 지구본 보기
              </Link>
              <LandingOrientationGuide />
            </div>
          </div>

          <LandingGlobePreview />
        </section>

        <LandingOverview />
      </main>

      <SiteFooter compact />
    </>
  );
}
