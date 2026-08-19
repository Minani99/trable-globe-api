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

const nextConfig: NextConfig = {
  // Next.js 16 blocks dev assets requested from a LAN origin unless it is explicitly allowed.
  allowedDevOrigins: [
    ...new Set(["localhost", "127.0.0.1", ...configuredDevOrigins, ...localNetworkOrigins]),
  ],
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
