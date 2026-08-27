import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";

import { AppFeedback } from "@/components/common/AppFeedback";
import { BackendWarmup } from "@/components/common/BackendWarmup";
import { siteConfig } from "@/lib/config";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const maxDuration = 60;

const themeInitScript = `(() => {
  try {
    const saved = localStorage.getItem("travel-globe-theme");
    document.documentElement.dataset.theme = saved === "dark" ? "dark" : "light";
  } catch {
    document.documentElement.dataset.theme = "light";
  }
})();`;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansKr = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  applicationName: siteConfig.name,
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: ["여행 계획", "여행 일정", "여행 기록", "여행 지도", "여행 지구본"],
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="bg-background text-content flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a className="skip-link" href="#main">
          본문으로 건너뛰기
        </a>
        <BackendWarmup />
        <AppFeedback />
        {children}
      </body>
    </html>
  );
}
