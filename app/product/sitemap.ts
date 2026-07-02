import type { MetadataRoute } from "next";
import { productUrl, compareUrl } from "@/constants/routes";
import { getProductSlugsCount, getProductSlugsPage } from "@/services/product.service";

// Release 1.7 — Wave 6: replaces the product/compare URLs that used to live
// in the monolithic root app/sitemap.ts. Chunked via generateSitemaps() so
// the catalog can grow into the millions without ever exceeding a search
// engine's per-file URL limit (~50k) or loading the full catalog into
// memory — each shard fetches only its own slice of slugs.
export const CHUNK_SIZE = 20_000; // × 2 URLs (product + compare) = 40k/shard, safely under the ~50k limit

export async function generateSitemaps() {
  const total = await getProductSlugsCount();
  const shardCount = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  return Array.from({ length: shardCount }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const shardId = Number(await id);
  const slugs = await getProductSlugsPage(shardId * CHUNK_SIZE, CHUNK_SIZE);
  const now = new Date();

  return slugs.flatMap((slug) => [
    { url: productUrl(slug), lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
    { url: compareUrl(slug), lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
  ]);
}
