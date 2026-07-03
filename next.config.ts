import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage — catálogo de imagens
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Placeholder e imagens externas (demo / CDNs de marca)
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // Release 1.8 — Sprint 0.1 (Canonical Route Audit): /store/[slug] and
  // /lojas/[slug] were two independent implementations of the same public
  // store page, both indexed in sitemap.xml simultaneously (duplicate
  // content). /lojas/[slug] is canonical — generateMetadata, JSON-LD,
  // breadcrumbs, Merchant Score, ClaimStoreButton all live there; /store
  // was the older, thinner implementation. Both key off the same
  // `stores.slug` column, so this is a direct 1:1 mapping, not a lookup —
  // a config-level 308 redirect is the correct fix, not a per-page
  // permanentRedirect() (no data dependency to justify running React for
  // this). 308 (permanent: true) so search engines transfer link equity to
  // the canonical URL instead of treating the redirect as temporary.
  async redirects() {
    return [
      {
        source: "/store/:slug",
        destination: "/lojas/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
