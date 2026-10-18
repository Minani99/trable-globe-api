import type { CSSProperties, ReactNode } from "react";

const icons = {
  "arrow-right": <path d="M4 12h16m-6-6 6 6-6 6" />,
  "arrow-left": <path d="M20 12H4m6-6-6 6 6 6" />,
  "arrow-up": <path d="M12 20V4m-6 6 6-6 6 6" />,
  "arrow-down": <path d="M12 4v16m-6-6 6 6 6-6" />,
  "arrow-up-right": <path d="M5 19 19 5M6 5h13v13" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-down": <path d="m5 9 7 7 7-7" />,
  "chevron-up": <path d="m5 15 7-7 7 7" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  plus: <path d="M12 4v16M4 12h16" />,
  minus: <path d="M4 12h16" />,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  user: <><circle cx="12" cy="8" r="3.5" /><path d="M5 21v-1a7 7 0 0 1 14 0v1" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18Z" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  shield: <><path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>,
  camera: <><path d="M8 6 9.5 3h5L16 6h3a2 2 0 0 1 2 2v11H3V8a2 2 0 0 1 2-2h3Z" /><circle cx="12" cy="12.5" r="3.5" /></>,
  check: <path d="m4 12 5 5L20 6" />,
  logout: <><path d="M9 4H4v16h5M10 12h11m-4-4 4 4-4 4" /></>,
  trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  "map-pin": <><path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h3M7 17h6" /></>,
  suitcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V4h8v3M8 7v13M16 7v13" /></>,
  edit: <><path d="m4 16-1 5 5-1L20 8l-4-4L4 16ZM13 7l4 4M4 4h5" /></>,
  note: <><path d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h4" /></>,
  photo: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="8" cy="9" r="1.5" /><path d="m4 18 6-6 4 4 3-3 4 4" /></>,
  share: <><path d="M12 15V3m-4 4 4-4 4 4M5 11H3v10h18V11h-2" /></>,
  copy: <><rect x="8" y="8" width="13" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
  drag: <><circle cx="9" cy="5" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="19" r="1" /></>,
  plane: <path d="m21 3-6 18-4-8-8-4L21 3ZM11 13l5-5" />,
  checklist: <><path d="m3 6 2 2 3-4M11 6h10M3 13h4M11 13h10M3 20h4M11 20h10" /></>,
  wallet: <><path d="M20 7V4H5a2 2 0 0 0 0 4h16v13H5a2 2 0 0 1-2-2V6M21 12h-6v5h6" /><path d="M17 14.5h.1" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2m-3-9-1.5 1.5M6.5 17.5 5 19M5 5l1.5 1.5m11 11L19 19" /></>,
  moon: <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10Z" />,
  cloud: <path d="M7 18a5 5 0 1 1 1-9 6 6 0 0 1 12-1 5 5 0 0 1-1 10H7Z" />,
  rain: <><path d="M6 15a4 4 0 1 1 1-8 6 6 0 0 1 11-1 4.5 4.5 0 0 1 2 9M8 18l-1 3M13 17l-1 3M18 18l-1 3" /></>,
  snow: <path d="M12 2v20M3.5 7l17 10M3.5 17l17-10M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M17 19l-1-4 4-1M4 14l4 1-1 4M17 5l-1 4 4 1" />,
  wind: <path d="M3 8h12a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h5a3 3 0 1 1-3 3" />,
  refresh: <><path d="M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5M4 14a8 8 0 0 0 14 5l3-3m0 5v-5h-5" /></>,
  crosshair: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  expand: <path d="M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5" />,
  route: <><circle cx="5" cy="5" r="2" /><circle cx="19" cy="19" r="2" /><path d="M9 5h7a4 4 0 0 1 0 8H8a4 4 0 0 0 0 8h5" /></>,
  upload: <path d="M12 16V3m-5 5 5-5 5 5M3 16v5h18v-5" />,
} satisfies Record<string, ReactNode>;

export type AppIconName = keyof typeof icons;

/** Shared decorative icons. Buttons and links retain their own accessible labels. */
export function AppIcon({ name, size = 20, className = "" }: { name: AppIconName; size?: number; className?: string }) {
  return <svg className={`app-icon ${className}`.trim()} style={{ "--app-icon-size": `${size}px` } as CSSProperties} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{icons[name]}</svg>;
}
