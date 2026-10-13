import type { ReactNode } from "react";

/*
 * One stroke icon set for the whole app.
 *
 * Text glyphs such as → ↗ × ⌄ render thin and at different sizes in every font,
 * which made arrow buttons hard to spot. Every icon here shares a 24px grid and a
 * 2px round stroke, inherits `currentColor`, and scales with the surrounding font
 * size (see .ui-icon in styles/icons.css). Icons are always decorative: the
 * button or link that contains one must carry its own text or aria-label.
 */
const DOT = { fill: "currentColor", stroke: "none" } as const;

const ICONS = {
  "arrow-right": <path d="M5 12h14M13 6l6 6-6 6" />,
  "arrow-left": <path d="M19 12H5M11 6l-6 6 6 6" />,
  "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
  "arrow-down": <path d="M12 5v14M6 13l6 6 6-6" />,
  "arrow-up-right": <path d="M7 17 17 7M8.5 7H17v8.5" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-down": <path d="m6 9.5 6 6 6-6" />,
  "chevron-up": <path d="m6 14.5 6-6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></>,
  refresh: <><path d="M19.5 12.5a7.5 7.5 0 1 1-2.2-5.8" /><path d="M19.5 4.5v4.5H15" /></>,
  grip: <><circle cx="9" cy="6" r="1.6" {...DOT} /><circle cx="15" cy="6" r="1.6" {...DOT} /><circle cx="9" cy="12" r="1.6" {...DOT} /><circle cx="15" cy="12" r="1.6" {...DOT} /><circle cx="9" cy="18" r="1.6" {...DOT} /><circle cx="15" cy="18" r="1.6" {...DOT} /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="1.2" {...DOT} /></>,
  alert: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V13" /><circle cx="12" cy="16.3" r="1.2" {...DOT} /></>,
  target: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5" /></>,
  pin: <><path d="M12 21s6.5-5.6 6.5-11.5a6.5 6.5 0 1 0-13 0C5.5 15.4 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></>,
  share: <><path d="M12 15V4M7.5 8.5 12 4l4.5 4.5" /><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" /></>,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5.5 20c.8-3.9 3.1-6 6.5-6s5.7 2.1 6.5 6" /></>,
  mail: <><rect x="3.5" y="5.5" width="17" height="13" rx="2" /><path d="m4.5 7.5 7.5 5.5 7.5-5.5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  shield: <><path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.7 7 9 4.1-1.3 7-4.7 7-9V6Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  logout: <><path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" /><path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" /></>,
  trash: <><path d="M4.5 7h15M9.5 7V4.5h5V7" /><path d="m6.5 7 .8 12.5h9.4L17.5 7" /></>,
  camera: <><path d="M4 8.5h3.2L9 6h6l1.8 2.5H20V19H4Z" /><circle cx="12" cy="13.5" r="3.3" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.2 2.3 3.3 5.1 3.3 8.5S14.2 18.2 12 20.5M12 3.5C9.8 5.8 8.7 8.6 8.7 12s1.1 6.2 3.3 8.5" /></>,
  plane: <path d="M10.5 4.2c0-.9.7-1.7 1.5-1.7s1.5.8 1.5 1.7V9l7 4.2v2l-7-2.2v4.6l2.3 1.7v1.7L12 20.2 8.2 21v-1.7l2.3-1.7V13l-7 2.2v-2l7-4.2Z" />,
  checklist: <><path d="m4.5 6.5 1.5 1.5 3-3M4.5 12.5 6 14l3-3M4.5 18.5 6 20l3-3" /><path d="M12.5 7h7M12.5 13h7M12.5 19h7" /></>,
  wallet: <><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" /><rect x="4" y="8" width="16" height="11" rx="2" /><path d="M16 13.5h.01" strokeWidth="2.6" /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 10h16M8 14h3M8 17h6" /></>,
  photo: <><rect x="3.5" y="5" width="17" height="14" rx="2" /><circle cx="9" cy="10" r="1.7" /><path d="m5.5 17 4.3-4 2.9 2.5 2.4-2.2 3.4 3.7" /></>,
  note: <><path d="M6 3.5h9l4 4v13H6Z" /><path d="M14.5 3.5V8H19M9 12.5h7M9 16h5" /></>,
  umbrella: <><path d="M3.5 12a8.5 8.5 0 0 1 17 0Z" /><path d="M12 12v6a2 2 0 0 1-4 0M12 3.5v-1" /></>,
  "weather-clear": <><circle cx="12" cy="12" r="4" /><path d="M12 3v1.8M12 19.2V21M5.6 5.6l1.3 1.3M17.1 17.1l1.3 1.3M3 12h1.8M19.2 12H21M5.6 18.4l1.3-1.3M17.1 6.9l1.3-1.3" /></>,
  "weather-partly": <><path d="M8.5 2.8v1.4M3.3 8h1.4M4.8 4.3l1 1M12.2 4.3l-1 1" /><path d="M5.7 11.3A3.5 3.5 0 0 1 11.8 6.9" /><path d="M9.5 20h8a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9A3.2 3.2 0 0 0 9.5 20Z" /></>,
  "weather-cloudy": <path d="M7.5 18.5h9.5a4 4 0 0 0 .6-8 5.5 5.5 0 0 0-10.6 1.3 3.4 3.4 0 0 0 .5 6.7Z" />,
  "weather-fog": <><path d="M7.5 13.5h9.5a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9 3.2 3.2 0 0 0-.5 6.3Z" /><path d="M4.5 17h15M7 20.5h10" /></>,
  "weather-drizzle": <><path d="M7.5 14h9.5a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9A3.2 3.2 0 0 0 7.5 14Z" /><path d="M9 17.5v.5M12 19.5v.5M15 17.5v.5" /></>,
  "weather-rain": <><path d="M7.5 14h9.5a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9A3.2 3.2 0 0 0 7.5 14Z" /><path d="m9 17-1 3M13 17l-1 3M17 17l-1 3" /></>,
  "weather-snow": <><path d="M7.5 14h9.5a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9A3.2 3.2 0 0 0 7.5 14Z" /><path d="M8.5 17.5v.01M12 18.5v.01M15.5 17.5v.01M10 21v.01M14 21v.01" strokeWidth="2.6" /></>,
  "weather-storm": <><path d="M7.5 14h9.5a3.6 3.6 0 0 0 .5-7.2 5 5 0 0 0-9.5.9A3.2 3.2 0 0 0 7.5 14Z" /><path d="m12.8 14.5-2.3 3.5h3l-2.3 3.5" /></>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      className={className ? `ui-icon ${className}` : "ui-icon"}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {ICONS[name]}
    </svg>
  );
}
