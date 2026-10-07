import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOverview } from "@/components/landing/LandingOverview";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="landing-main flex flex-1 flex-col overflow-hidden">
        <section aria-labelledby="landing-title" className="landing-hero site-shell">
          <div className="landing-copy relative z-10">
            <p className="page-caption">나의 여행 노트</p>
            <h1 id="landing-title" className="landing-title text-content">
              <span className="landing-title-line landing-title-line--one">다음 여행을</span>{" "}
              <span className="landing-title-line landing-title-line--two">펼쳐보세요.</span>
            </h1>

            <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
              일정을 정리하고, 다녀온 곳은 지구본에 남겨두세요.
              여행 전에도, 돌아온 뒤에도 꺼내 보는 나만의 노트.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <LandingStartAction />
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
