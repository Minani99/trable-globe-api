import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { LandingOrientationGuide } from "@/components/landing/LandingOrientationGuide";
import { LandingStartAction } from "@/components/landing/LandingStartAction";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { profilePath, siteConfig } from "@/lib/config";

const IDENTITY_LAYERS = [
  { number: "01", term: "GLOBE", title: "방문한 세계", description: "다녀온 국가와 도시가 지구본 위에 하나씩 채워집니다." },
  { number: "02", term: "JOURNEY", title: "이어진 여정", description: "여행마다 장소와 이동 경로가 하나의 Journey로 이어집니다." },
  { number: "03", term: "MEMORY", title: "남겨진 기억", description: "그날의 사진과 메모가 장소에 머물러 다시 꺼내볼 수 있습니다." },
  { number: "04", term: "IDENTITY", title: "나만의 여행 세계", description: "쌓인 여행은 시간과 취향이 보이는 하나의 프로필이 됩니다." },
] as const;

const JOURNEY_STEPS = [
  { term: "PLAN", title: "가고 싶은 곳을 정합니다", description: "나라와 날짜, 관심 장소를 골라 다음 Journey의 시작점을 만듭니다." },
  { term: "TRAVEL", title: "여행의 순간을 남깁니다", description: "실제로 방문한 장소를 확인하고 사진과 메모를 가볍게 더합니다." },
  { term: "MEMORY", title: "내 세계에 이어집니다", description: "여행이 끝나면 경로와 기억이 지구본과 여행 아카이브에 남습니다." },
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
              YOUR WORLD, SHAPED BY TRAVEL.
            </p>
            <h1 id="landing-title" className="landing-title text-content max-w-[13ch]">
              <span className="landing-title-line landing-title-line--one">여행할수록,</span>{" "}
              <span className="landing-title-line landing-title-line--two">나만의 세계가 만들어집니다.</span>
            </h1>

            <p className="text-body landing-intro landing-reveal landing-reveal--body mt-7 max-w-[40ch]">
              방문한 국가와 도시, 이동한 길과 기억을 하나의 지구본에 쌓아보세요.
              오른쪽 지구본에서는 190여 개 나라와 대표 랜드마크를 먼저 탐색할 수 있습니다.
            </p>

            <div className="landing-reveal landing-reveal--actions mt-10 flex flex-wrap items-center gap-3">
              <LandingStartAction />
              <Link href={sampleWorldPath} className="landing-secondary-cta">
                다국가 샘플 세계 보기
              </Link>
              <LandingOrientationGuide />
            </div>

            <p className="landing-start-hint">계획은 시작점이고, 여행이 쌓이는 곳은 내 지구본입니다.</p>
          </div>

          <LandingGlobePreview />
        </section>

        <section aria-labelledby="identity-heading" className="landing-experience site-shell">
          <div className="landing-section-heading hairline">
            <div>
              <p className="landing-section-index">01 · YOUR TRAVEL IDENTITY</p>
              <h2 id="identity-heading">여행 기록이 쌓일수록<br />나만의 세계가 선명해집니다.</h2>
            </div>
            <p>
              게시글을 하나 더 만드는 경험이 아닙니다. 다녀온 곳과 이동한 길, 그곳의 기억이
              서로 연결되며 시간이 지날수록 나만의 여행 정체성이 만들어집니다.
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
              <p className="landing-section-index">02 · FROM PLAN TO MEMORY</p>
              <h2 id="journey-heading">한 번의 여행이<br />하나의 Journey가 되기까지.</h2>
            </div>
            <p>
              계획 기능은 목적지가 아니라 기록을 더 쉽게 시작하는 방법입니다. 같은 일정을
              다시 쓰지 않고, 여행한 그대로 내 세계에 이어 붙입니다.
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
            <p className="landing-section-index">03 · EVERY JOURNEY BECOMES PART OF YOUR WORLD</p>
            <h2 id="world-proof-heading">모든 여행은<br />당신의 세계가 됩니다.</h2>
            <p>
              국가와 도시, 이동 경로, 장소와 사진이 따로 흩어지지 않습니다. 한 번의 여행은
              하나의 Journey가 되고, Journey들이 모여 지금까지 살아온 여행 세계를 만듭니다.
            </p>
          </div>
          <div className="landing-world-proof__actions">
            <Link href={sampleWorldPath} className="landing-primary-cta">
              <span>여러 나라가 쌓인 샘플 보기</span>
              <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
            </Link>
            <Link href="/discover" className="landing-text-link">
              다른 여행자의 세계 둘러보기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter compact />
    </>
  );
}
