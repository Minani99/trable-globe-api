"use client";

import { useEffect } from "react";

// Only the last displayed scene is needed to avoid an immediate repeat.
export function RememberScene({ code, example }: { code: string; example: string }) {
  useEffect(() => {
    document.cookie = `tg_scene=${code}.${example}; Path=/; SameSite=Lax`;
  }, [code, example]);
  return null;
}
