import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Noto_Sans_KR } from "next/font/google";

import { AppFeedback } from "@/components/common/AppFeedback";
import { BackendWarmup } from "@/components/common/BackendWarmup";
import { PwaManager } from "@/components/common/PwaManager";
import { SessionExpiryNotice } from "@/components/common/SessionExpiryNotice";
import { siteConfig } from "@/lib/config";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

export const maxDuration = 60;

export const viewport: Viewport = {
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1113" },
  ],
};

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
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon-180.png",
  },
  keywords: ["여행 지구본", "여행 기록", "여행 아카이브", "여행 지도", "여행 계획"],
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
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansKr.variable} h-full antialiased`}
    >
      <body className="bg-background text-content flex min-h-full flex-col">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <a className="skip-link" href="#main">
          본문으로 건너뛰기
        </a>
        <BackendWarmup />
        <PwaManager />
        <AppFeedback />
        <SessionExpiryNotice />
        {children}
      </body>
    </html>
  );
}
