"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/common/Icon";

const SECTIONS: Array<{ id: string; label: string; hint: string; icon: IconName; danger?: boolean }> = [
  { id: "profile", label: "프로필", hint: "사진 · 이름 · 소개", icon: "user" },
  { id: "account", label: "로그인 정보", hint: "사용자명 · 이메일", icon: "mail" },
  { id: "security", label: "비밀번호", hint: "변경 · 재설정", icon: "lock" },
  { id: "danger", label: "계정 삭제", hint: "모든 기록 삭제", icon: "trash", danger: true },
];

/** Section links that mark the card currently in view. */
export function AccountSectionNav() {
  const [current, setCurrent] = useState(SECTIONS[0].id);

  useEffect(() => {
    const targets = SECTIONS.map(({ id }) => document.getElementById(id)).filter((target): target is HTMLElement => Boolean(target));
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (visible[0]) setCurrent(visible[0].target.id);
    }, { rootMargin: "-20% 0px -55% 0px" });
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="account-nav" aria-label="내 정보 항목">
      {SECTIONS.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          className={section.danger ? "is-danger" : undefined}
          aria-current={current === section.id ? "location" : undefined}
          onClick={() => setCurrent(section.id)}
        >
          <Icon name={section.icon} />
          <span><strong>{section.label}</strong><small>{section.hint}</small></span>
        </a>
      ))}
    </nav>
  );
}
