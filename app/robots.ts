import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/routes";
import { getProductSlugsCount } from "@/services/product.service";
import { CHUNK_SIZE } from "@/app/product/sitemap";

// Wave 6 (Release 1.7): app/sitemap.ts and app/product/sitemap.ts now use
// generateSitemaps() to emit sitemap indexes (chunked by entity type, and
// further by count for products/compare) instead of one monolithic
// sitemap.xml. Next.js does not auto-publish an index page for split
// sitemaps, so every chunk is listed directly here — the documented pattern
// for multi-sitemap sites (robots.txt supports repeated `Sitemap:` lines).
const STATIC_SITEMAP_IDS = ["static", "lojas"] as const;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const productCount = await getProductSlugsCount();
  const productShardCount = Math.max(1, Math.ceil(productCount / CHUNK_SIZE));
  const productShardUrls = Array.from(
    { length: productShardCount },
    (_, id) => `${SITE_URL}/product/sitemap/${id}.xml`
  );

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/_next/"],
      },
    ],
    sitemap: [
      ...STATIC_SITEMAP_IDS.map((id) => `${SITE_URL}/sitemap/${id}.xml`),
      ...productShardUrls,
    ],
    host: SITE_URL,
  };
}
