import type { NextConfig } from "next";

const config: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  outputFileTracingExcludes: { "/*": [".env*"] },
  outputFileTracingIncludes: { "/*": ["./content/posts/*.md"] },
  // Freeze publication eligibility for both static detail pages and dynamic search.
  // This timestamp is public build metadata, never a credential.
  env: { CONTENT_PUBLISH_CUTOFF: new Date().toISOString() },
  async redirects() {
    return [
      { source: "/posts/page/:page", destination: "/posts/?page=:page", permanent: true },
      { source: "/admin/index.html", destination: "/admin/", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/admin/:path*", headers: [{ key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" }] }];
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/admin/config.yml", destination: "/api/cms/config" }] };
  },
};
export default config;
