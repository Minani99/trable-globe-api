"use client";

import { useEffect } from "react";

/** Keep fixed controls stable across focus changes; react to the keyboard itself. */
export function MobileViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const keyboardOpen = viewport.scale === 1 && window.innerHeight - viewport.height > 150;
      document.documentElement.toggleAttribute("data-mobile-keyboard", keyboardOpen);
    };
    update();
    viewport.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      viewport.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.removeAttribute("data-mobile-keyboard");
    };
  }, []);
  return null;
}
