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
    title: "몇 번의 선택으로 계획",
    description: "나라와 날짜, 동행과 취향만 고르면 일차별 일정 뼈대가 먼저 만들어집니다.",
  },
  {
    number: "02",
    title: "여행 중에는 오늘만",
    description: "복잡한 문서 대신 오늘 갈 장소와 체크할 항목을 중심으로 가볍게 확인합니다.",
  },
  {
    number: "03",
    title: "계획을 그대로 기록으로",
    description: "다녀온 장소를 체크하고 사진과 메모만 더하면 같은 여행이 기록으로 전환됩니다.",
  },
  {
    number: "04",
    title: "지구본에 쌓이는 세계",
    description: "완료한 여행은 경로와 장면이 되어 나만의 지구본과 공개 프로필에 이어집니다.",
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
              <h1>여행을 준비하는 순간부터, 살아온 세계로 남깁니다.</h1>
              <p>
                {siteConfig.name}는 빈 템플릿을 채우는 수고 없이 여행을 계획하고, 여행 중의
                일정과 다녀온 뒤의 사진을 하나의 흐름으로 잇습니다. 다음 여행은 가볍게 시작하고,
                완성된 기억은 3D 지구본 위에 오래 남길 수 있습니다.
              </p>
              <div className="about-hero__actions">
                <Link href="/register?next=%2Fstudio%2Fplans%2Fnew" className="landing-primary-cta">
                  <span>첫 여행 계획하기</span>
                  <span className="landing-primary-cta__arrow" aria-hidden="true">↗</span>
                </Link>
                <Link href={globePath} className="landing-secondary-cta">샘플 둘러보기</Link>
              </div>
            </div>
          </header>

          <section className="about-capabilities" aria-labelledby="available-heading">
            <div className="about-section-heading">
              <div>
                <h2 id="available-heading">지금 경험할 수 있는 것</h2>
              </div>
              <p>계획, 여행, 기록, 공유가 하나의 여행 안에서 자연스럽게 이어집니다.</p>
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
