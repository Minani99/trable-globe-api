import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOrientationGuide } from "@/components/landing/LandingOrientationGuide";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

const IDENTITY_LAYERS = [
  { number: "01", term: "GLOBE", title: "방문 국가", description: "다녀온 나라와 도시를 지구본에서 확인합니다." },
  { number: "02", term: "ROUTE", title: "여행 경로", description: "장소와 이동 경로를 여행별로 연결합니다." },
  { number: "03", term: "RECORD", title: "사진과 메모", description: "장소마다 사진과 메모를 남깁니다." },
  { number: "04", term: "PROFILE", title: "공개 프로필", description: "공개한 여행을 한곳에서 공유합니다." },
] as const;

const JOURNEY_STEPS = [
  { term: "PLAN", title: "계획 만들기", description: "나라, 날짜, 장소를 선택해 일정을 만듭니다." },
  { term: "TRAVEL", title: "여행 중 확인하기", description: "일정과 예약 정보를 모바일에서 확인합니다." },
  { term: "RECORD", title: "기록으로 전환하기", description: "다녀온 장소와 사진을 확인해 여행 기록으로 남깁니다." },
] as const;

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

        <section aria-labelledby="identity-heading" className="landing-experience site-shell">
          <div className="landing-section-heading hairline">
            <div>
              <p className="landing-section-index">01 · TRAVEL RECORD</p>
              <h2 id="identity-heading">다녀온 곳을<br />지구본에서 확인하세요.</h2>
            </div>
            <p>
              방문 국가, 도시, 이동 경로, 사진과 메모를 여행별로 연결해 보여줍니다.
            </p>
          </div>

          <ol className="landing-identity-flow">
            {IDENTITY_LAYERS.map((layer) => (
              <li key={layer.term}>
                <span>{layer.number}</span>
                <small>{layer.term}</small>
                <h3>{layer.title}</h3>
                <p>{layer.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="journey-heading" className="landing-journey site-shell">
          <header className="landing-section-heading">
            <div>
              <p className="landing-section-index">02 · PLAN TO RECORD</p>
              <h2 id="journey-heading">계획을<br />다시 쓰지 마세요.</h2>
            </div>
            <p>
              작성한 일정은 여행 중 체크리스트로, 여행 후에는 기록으로 전환됩니다.
            </p>
          </header>

          <ol className="landing-journey-flow">
            {JOURNEY_STEPS.map((step, index) => (
              <li key={step.term}>
                <div className="landing-journey-flow__marker">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <i aria-hidden="true" />
                </div>
                <small>{step.term}</small>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="world-proof-heading" className="landing-world-proof site-shell">
          <div className="landing-world-proof__route" aria-hidden="true">
            <span>GLOBE</span><i /><span>JOURNEY</span><i /><span>MEMORY</span><i /><span>IDENTITY</span>
          </div>
          <div className="landing-world-proof__copy">
            <p className="landing-section-index">03 · PUBLIC PROFILE</p>
            <h2 id="world-proof-heading">공개한 여행을<br />한곳에서 공유하세요.</h2>
            <p>
              공개 프로필에는 지구본과 여행 기록만 표시됩니다. 공개 여부는 여행별로 선택할 수 있습니다.
            </p>
          </div>
          <div className="landing-world-proof__actions">
            <Link href={sampleWorldPath} className="landing-primary-cta">
              <span>샘플 프로필 보기</span>
              <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
            </Link>
            <Link href="/discover" className="landing-text-link">
              공개 여행 둘러보기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter compact />
    </>
  );
}
