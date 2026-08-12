"use client";

import { applyColorTheme, useColorTheme } from "@/lib/theme";

export function ThemeToggle() {
  const theme = useColorTheme();
  const isDark = theme === "dark";
  const nextTheme = isDark ? "light" : "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${nextTheme === "light" ? "밝은" : "어두운"} 화면으로 전환`}
      aria-pressed={isDark}
      title={`${nextTheme === "light" ? "밝은" : "어두운"} 화면으로 전환`}
      onClick={() => applyColorTheme(nextTheme)}
    >
      <span className="theme-toggle__track" aria-hidden="true">
        <span className="theme-toggle__thumb">
          {isDark ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
      <span className="theme-toggle__label">{isDark ? "밝게" : "어둡게"}</span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" fill="currentColor" />
      <path
        d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M19.1 15.4A8 8 0 0 1 8.6 4.9a7.5 7.5 0 1 0 10.5 10.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
