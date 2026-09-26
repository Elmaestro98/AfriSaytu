import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The service worker must never be cached by the browser or a CDN: a new version must reach
  // the phones at once. It only ever controls this site (scope "/").
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
