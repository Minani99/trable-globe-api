import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Travel Globe",
    short_name: "Travel Globe",
    description: "여행 계획과 현장 기록을 하나의 지구본에 이어 보세요.",
    start_url: "/studio",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f6f7f4",
    theme_color: "#f6f7f4",
    categories: ["travel", "lifestyle"],
    lang: "ko-KR",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcuts: [
      { name: "내 여행", short_name: "내 여행", url: "/studio" },
      { name: "여행 계획 만들기", short_name: "새 계획", url: "/studio/plans/new" },
      { name: "여행 지구본", short_name: "지구본", url: "/globe" },
    ],
  };
}
