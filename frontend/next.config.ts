import { networkInterfaces } from "node:os";

import type { NextConfig } from "next";

const DEFAULT_API_BASE_URL = "http://localhost:8080";

const apiBaseUrl = (
  process.env.API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const configuredDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const localNetworkOrigins = Object.values(networkInterfaces())
  .flatMap((addresses) => addresses ?? [])
  .filter((address) => address.family === "IPv4" && !address.internal)
  .map((address) => address.address);

const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const noIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const privatePageHeaders = [
  ...noIndexHeaders,
  { key: "Cache-Control", value: "private, no-store" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next.js 16 blocks dev assets requested from a LAN origin unless it is explicitly allowed.
  allowedDevOrigins: [
    ...new Set(["localhost", "127.0.0.1", ...configuredDevOrigins, ...localNetworkOrigins]),
  ],
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: noIndexHeaders },
      { source: "/api/auth/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/private/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/api/uploads/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      { source: "/settings/:path*", headers: privatePageHeaders },
      { source: "/studio/:path*", headers: privatePageHeaders },
      { source: "/login/:path*", headers: noIndexHeaders },
      { source: "/register/:path*", headers: noIndexHeaders },
      { source: "/forgot-password/:path*", headers: noIndexHeaders },
      { source: "/reset-password/:path*", headers: noIndexHeaders },
      { source: "/verify-email/:path*", headers: noIndexHeaders },
      { source: "/feedback/:path*", headers: noIndexHeaders },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/health",
        destination: `${apiBaseUrl}/api/health`,
      },
      {
        source: "/api/profiles/:path*",
        destination: `${apiBaseUrl}/api/profiles/:path*`,
      },
      {
        source: "/api/travels/:path*",
        destination: `${apiBaseUrl}/api/travels/:path*`,
      },
      {
        source: "/api/discovery/:path*",
        destination: `${apiBaseUrl}/api/discovery/:path*`,
      },
    ];
  },
};

export default nextConfig;
