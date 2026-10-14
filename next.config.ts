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
  // Mission 05.14 — execução self-hosted (VPS Fluence). `standalone` gera
  // `.next/standalone/server.js` com o node_modules mínimo, que é o que a
  // imagem Docker roda. Em Vercel a opção é inofensiva (o builder da Vercel
  // não a utiliza).
  output: "standalone",

  images: {
    // Mission 05.14 — `sharp` NÃO é dependência do projeto. No self-hosted o
    // otimizador do `next/image` exige `sharp`; sem ele as requisições de
    // imagem devolveriam 500. Esta chave é ligada por VARIÁVEL DE AMBIENTE,
    // definida apenas no Dockerfile/compose do VPS: as imagens passam a ser
    // servidas direto do Storage (Caddy → Supabase Storage), sem custo de CPU
    // de otimização nos 4 vCPU que o PostgreSQL também usa. Em Vercel a
    // variável não existe ⇒ a otimização continua exatamente como hoje.
    // Caminho de otimização futuro (aprovação à parte): custom loader
    // apontando para o `imgproxy` que já roda no stack.
    unoptimized: process.env.SELF_HOSTED_IMAGES_UNOPTIMIZED === "1",
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
