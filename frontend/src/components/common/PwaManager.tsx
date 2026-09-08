"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "travel-globe:pwa-install-dismissed";
const DISMISS_DAYS = 14;

export function PwaManager() {
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const isIos = useMemo(() => typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const register = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setInstalled(standalone);
      const dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY));
      setDismissed(Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000);
    });

    const capturePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const markInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      window.localStorage.removeItem(DISMISS_KEY);
    };
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", capturePrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);

  const inTravelWorkspace = pathname === "/studio"
    || pathname === "/settings"
    || pathname.startsWith("/studio/travels/");
  const canShow = !installed && !dismissed && inTravelWorkspace && (Boolean(installPrompt) || isIos);
  if (!canShow) return null;

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  };

  const install = async () => {
    if (!installPrompt) {
      setShowIosHelp(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === "accepted") setInstalled(true);
    else dismiss();
  };

  return (
    <aside className="pwa-install" aria-label="Travel Globe 앱 설치">
      <span className="pwa-install__icon" aria-hidden="true">◎</span>
      <div>
        <strong>홈 화면에서 바로 열기</strong>
        <p>{showIosHelp ? "Safari 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요." : "여행 중에는 앱처럼 빠르게 열 수 있어요."}</p>
      </div>
      {!showIosHelp ? <button type="button" onClick={() => void install()}>{installPrompt ? "설치" : "방법 보기"}</button> : null}
      <button type="button" className="pwa-install__close" onClick={dismiss} aria-label="앱 설치 안내 닫기">×</button>
    </aside>
  );
}
