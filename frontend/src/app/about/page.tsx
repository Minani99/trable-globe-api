import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { globePath, siteConfig } from "@/lib/config";

export const metadata: Metadata = {
  title: "서비스 이야기",
  description: siteConfig.description,
};

const CAPABILITIES = [
  {
    number: "01",
    title: "내 여행이 보이는 지구본",
    description: "방문한 국가와 도시, 이동 경로가 하나의 3D 세계 위에 이어집니다.",
  },
  {
    number: "02",
    title: "Journey로 남는 여행",
    description: "장소와 사진, 메모가 한 번의 Journey 안에서 시간순으로 기억됩니다.",
  },
  {
    number: "03",
    title: "계획에서 기억까지",
    description: "여행 전 계획은 실제로 다녀온 장소를 확인하면 다시 쓰지 않고 기록으로 이어집니다.",
  },
  {
    number: "04",
    title: "시간과 함께 자라는 세계",
    description: "연도별 여행과 리캡을 돌아보며 나의 여행 세계가 넓어진 시간을 확인합니다.",
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main id="main" className="about-page flex-1">
        <div className="site-shell">
          <header className="about-hero">
            <div className="about-hero__copy">
              <p className="eyebrow">Every journey becomes part of your world.</p>
              <h1>당신이 걸어온 여행을<br />하나의 세계로 기록하세요.</h1>
              <p>
                {siteConfig.name}는 다녀온 국가와 도시, 이동한 길과 기억을 하나의 3D 지구본에
                쌓는 개인 여행 세계입니다. 계획은 가볍게 시작하고, 완성된 Journey는 시간이
                지날수록 나를 보여주는 여행 정체성이 됩니다.
              </p>
              <div className="about-hero__actions">
                <Link href="/register?next=%2Fstudio" className="landing-primary-cta">
                  <span>내 지구본 만들기</span>
                  <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
                </Link>
                <Link href={globePath} className="landing-secondary-cta">샘플 세계 둘러보기</Link>
              </div>
            </div>
          </header>

          <section className="about-capabilities" aria-labelledby="available-heading">
            <div className="about-section-heading">
              <div>
                <h2 id="available-heading">지금 경험할 수 있는 것</h2>
              </div>
              <p>지구본, Journey, 기억과 리캡이 하나의 여행 세계 안에서 자연스럽게 이어집니다.</p>
            </div>

            <ol className="about-capability-grid">
              {CAPABILITIES.map((item) => (
                <li key={item.number}>
                  <span>{item.number}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </li>
              ))}
            </ol>
          </section>

        </div>
      </main>

      <SiteFooter />
    </>
  );
}
