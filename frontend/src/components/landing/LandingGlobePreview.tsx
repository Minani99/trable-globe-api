"use client";

import Image from "next/image";
import Link from "next/link";
import type { PointerEvent } from "react";

import heroGlobe from "@/app/opengraph-image.png";

interface LandingGlobePreviewProps {
  href: string;
}

export function LandingGlobePreview({ href }: LandingGlobePreviewProps) {
  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    event.currentTarget.style.setProperty("--pointer-x", x.toFixed(3));
    event.currentTarget.style.setProperty("--pointer-y", y.toFixed(3));
  };

  const resetPointer = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--pointer-x", "0");
    event.currentTarget.style.setProperty("--pointer-y", "0");
  };

  return (
    <Link
      href={href}
      className="landing-globe-link landing-reveal landing-reveal--visual group"
      aria-label="Travel Globe 공개 샘플 열기"
    >
      <figure
        className="landing-globe-scene"
        onPointerMove={handlePointerMove}
        onPointerLeave={resetPointer}
      >
        <div className="landing-globe-frame">
          <Image
            src={heroGlobe}
            alt="아시아와 유럽의 여행 경로가 빛나는 검푸른 지구본"
            fill
            priority
            sizes="(max-width: 1023px) 92vw, 52vw"
            className="landing-globe-image"
          />
          <span className="landing-globe-vignette" aria-hidden="true" />
          <span className="landing-globe-grid" aria-hidden="true" />

          <div className="landing-globe-meta" aria-hidden="true">
            <span>LIVE ARCHIVE</span>
            <span>04 COUNTRIES · 07 CITIES</span>
          </div>

          <span className="landing-globe-pin landing-globe-pin--europe" aria-hidden="true">
            <span>EUROPE</span>
          </span>
          <span className="landing-globe-pin landing-globe-pin--asia" aria-hidden="true">
            <span>TAIPEI · 25.03° N</span>
          </span>

          <div className="landing-memory-card">
            <div>
              <p className="eyebrow">Latest memory</p>
              <p className="text-content mt-1 text-[0.96rem] font-medium">Taipei, again.</p>
            </div>
            <div className="text-right">
              <p className="text-content-faint font-mono text-[0.64rem]">MAY · 2026</p>
              <p className="text-content-muted mt-1 text-[0.7rem]">2박 3일</p>
            </div>
          </div>

          <div className="landing-globe-cta" aria-hidden="true">
            <span>지구본 열기</span>
            <span className="landing-globe-cta__arrow">↗</span>
          </div>
        </div>

        <figcaption className="sr-only">
          다녀온 나라와 도시, 여행 경로가 표시된 Travel Globe 공개 샘플
        </figcaption>
      </figure>
    </Link>
  );
}
