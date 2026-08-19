import Link from "next/link";

import { LandingGlobePreview } from "@/components/landing/LandingGlobePreview";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { globePath } from "@/lib/config";

export default function LandingPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="flex flex-1 flex-col overflow-hidden">
        <section className="landing-hero site-shell relative grid min-h-[calc(100svh-3.5rem)] flex-1 items-center gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,0.82fr)_minmax(520px,1.18fr)] lg:gap-4 lg:py-14">
          <div className="landing-copy relative z-10">
            <p className="eyebrow landing-reveal landing-reveal--eyebrow mb-6 flex items-center gap-3">
              <span className="landing-signal" aria-hidden="true" />
              3D personal travel archive
            </p>

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
              <Link
                href={globePath}
                className="landing-secondary-cta"
              >
                샘플 먼저 둘러보기
              </Link>
            </div>

            <p className="landing-reveal landing-reveal--assurance landing-assurance">
              무료로 시작 <span aria-hidden="true">·</span> 설치 없이 웹에서 <span aria-hidden="true">·</span> 여행마다 공개 범위 선택
            </p>

            <dl className="landing-stats landing-reveal landing-reveal--stats mt-11 grid max-w-[460px] grid-cols-3">
              <Stat value="04" label="샘플 방문 국가" />
              <Stat value="07" label="샘플 기록 도시" />
              <Stat value="05" label="샘플 여행 기록" />
            </dl>
          </div>

          <LandingGlobePreview href={globePath} />

          <div className="landing-scroll-cue" aria-hidden="true">
            <span>아래로 이어보기</span>
            <span className="landing-scroll-cue__line" />
          </div>
        </section>

        <section aria-labelledby="experience-heading" className="landing-experience site-shell">
          <div className="hairline grid gap-10 pt-12 md:grid-cols-[0.62fr_1.38fr] md:gap-16">
            <div>
              <p className="eyebrow mb-3">Three simple steps</p>
              <h2 id="experience-heading" className="text-heading text-content max-w-[12ch]">
                여행을 남기는 가장 짧은 흐름.
              </h2>
            </div>

            <dl className="grid gap-8 sm:grid-cols-3">
              <Feature
                number="01"
                term="장소를 잇고"
                description="지도에서 도시와 장소를 찾아 방문 순서대로 경로를 만듭니다."
              />
              <Feature
                number="02"
                term="장면을 더하고"
                description="각 장소에 사진과 메모를 더해 그날의 이야기를 완성합니다."
              />
              <Feature
                number="03"
                term="세계를 공유하고"
                description="공개한 여행은 로그인 없이 볼 수 있는 나만의 주소로 전합니다."
              />
            </dl>
          </div>
        </section>

        <section aria-labelledby="archive-heading" className="landing-archive site-shell">
          <div className="landing-archive__visual" aria-hidden="true">
            <div className="landing-archive__route">
              <span>SEOUL</span>
              <i />
              <span>TAIPEI</span>
              <i />
              <span>FUKUOKA</span>
            </div>
            <div className="landing-archive__photo landing-archive__photo--one">
              <span>01</span>
              <strong>도시의 첫 저녁</strong>
            </div>
            <div className="landing-archive__photo landing-archive__photo--two">
              <span>02</span>
              <strong>천천히 걷던 오후</strong>
            </div>
            <div className="landing-archive__stamp">MEMORY<br />ARCHIVE</div>
          </div>

          <div className="landing-archive__copy">
            <p className="eyebrow">From map to memory</p>
            <h2 id="archive-heading">지도에서 발견하고,<br />기록에서 다시 걷습니다.</h2>
            <p>
              방문 국가만 색칠하고 끝나지 않습니다. 한 번의 여행 안에서 도시와 장소를 잇고,
              사진과 메모를 시간의 순서로 되돌아볼 수 있습니다.
            </p>
            <Link href="/about" className="landing-text-link">
              기록 경험 자세히 보기 <span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>

        <section aria-labelledby="ownership-heading" className="landing-ownership site-shell">
          <div className="landing-ownership__heading">
            <div>
              <p className="eyebrow">Yours, by design</p>
              <h2 id="ownership-heading">보여줄 여행은 직접 고릅니다.</h2>
            </div>
            <p>소셜 피드의 속도 대신, 오래 남길 기록과 공유할 사람에 집중했습니다.</p>
          </div>

          <ul className="landing-promise-grid">
            <Promise number="01" title="여행별 공개 설정" description="작성한 여행마다 공개와 비공개를 선택할 수 있습니다." />
            <Promise number="02" title="로그인 없는 열람" description="공개 지구본은 링크 하나로 누구에게나 보여줄 수 있습니다." />
            <Promise number="03" title="기록 중심의 화면" description="좋아요와 알림보다 지도, 사진, 메모가 먼저 보입니다." />
          </ul>
        </section>

        <section className="landing-final-cta site-shell" aria-labelledby="start-heading">
          <div>
            <p className="eyebrow">Your world starts here</p>
            <h2 id="start-heading">첫 여행 하나면 충분합니다.</h2>
            <p>기억하고 싶은 여행부터 나만의 지구본에 올려 보세요.</p>
          </div>
          <div className="landing-final-cta__actions">
            <Link href="/register" className="landing-primary-cta">
              <span>무료로 시작하기</span>
              <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
            </Link>
            <Link href={globePath} className="landing-secondary-cta">샘플 지구본 보기</Link>
          </div>
        </section>
      </main>

      <SiteFooter compact />
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dt className="landing-stat-value">{value}</dt>
      <dd className="landing-stat-label">{label}</dd>
    </div>
  );
}

function Feature({ number, term, description }: { number: string; term: string; description: string }) {
  return (
    <div className="landing-feature group">
      <dt className="flex items-center gap-3">
        <span className="text-content-faint font-mono text-[0.65rem]">{number}</span>
        <span className="text-content text-[0.9rem] font-medium">{term}</span>
        <span className="landing-feature__arrow" aria-hidden="true">↗</span>
      </dt>
      <dd className="text-body mt-3 text-[0.86rem]">{description}</dd>
    </div>
  );
}

function Promise({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <li>
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </li>
  );
}
