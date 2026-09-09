"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { setCachedAuthMember } from "@/lib/auth-state";
import { SESSION_EXPIRED_EVENT } from "@/lib/session-events";

export function SessionExpiryNotice() {
  const [returnPath, setReturnPath] = useState("/studio");
  const [open, setOpen] = useState(false);
  const loginRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const showNotice = () => {
      setCachedAuthMember(null);
      setReturnPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      setOpen(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, showNotice);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, showNotice);
  }, []);

  useEffect(() => {
    if (open) loginRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="session-expiry" role="presentation">
      <section role="alertdialog" aria-modal="true" aria-labelledby="session-expiry-title" aria-describedby="session-expiry-description">
        <span className="session-expiry__icon" aria-hidden="true">↻</span>
        <div>
          <p>로그인 시간이 끝났습니다</p>
          <h2 id="session-expiry-title">다시 로그인해 주세요</h2>
          <p id="session-expiry-description">세션이 만료되어 저장하지 못했습니다. 여행 작성 화면의 임시 저장 내용은 유지됩니다.</p>
        </div>
        <div className="session-expiry__actions">
          <button type="button" onClick={() => setOpen(false)}>계속 확인</button>
          <Link ref={loginRef} href={`/login?next=${encodeURIComponent(returnPath)}`}>다시 로그인</Link>
        </div>
      </section>
    </div>
  );
}
