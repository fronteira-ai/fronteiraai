import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/routes";
import { getStores } from "@/services/store.service";

export const dynamic = "force-dynamic";

// Wave 6 (Release 1.7): sitemap-index instead of one monolithic sitemap.xml.
// Each id below becomes its own sitemap chunk (/sitemap/<id>.xml). Products
// and compare pages — the entity types with real millions-of-rows growth
// potential — are NOT shards here: they live in app/product/sitemap.ts,
// which paginates via getProductSlugsCount()/getProductSlugsPage() instead
// of loading the full catalog into memory, and shards further by count so
// no single file ever risks the ~50k-URL limit. Stores stay here unpaginated
// — a regional marketplace's store count doesn't have the same growth curve.
//
// Release 1.8 — Sprint 0.1 (Canonical Route Audit): this used to have a
// separate "stores" case pointing at the now-removed /store/[slug] (a
// duplicate of /lojas/[slug], both indexed simultaneously). Collapsed into
// a single "lojas" case — and switched from getStoresRanking(100) (top-100
// only, the limit the old "lojas" case already had) to getStores() (all
// stores), so removing the duplicate case doesn't silently shrink indexed
// coverage from "all stores" down to "top 100".
const SITEMAP_IDS = ["static", "lojas"] as const;
type SitemapId = (typeof SITEMAP_IDS)[number];

export async function generateSitemaps() {
  return SITEMAP_IDS.map((id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const sitemapId = (await id) as SitemapId;

  switch (sitemapId) {
    case "static":
      return [
        { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
        { url: `${SITE_URL}/products`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/lojas`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${SITE_URL}/para-lojistas`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
        { url: `${SITE_URL}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
      ];

    case "lojas": {
      const stores = await getStores();
      return stores
        .filter((s) => s.slug)
        .map((s) => ({
          url: `${SITE_URL}/lojas/${s.slug}`,
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: 0.85,
        }));
    }

    default:
      return [];
  }
}
