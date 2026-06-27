import type { MetadataRoute } from "next";
import { SITE_URL } from "@/constants/routes";
import { getProducts } from "@/services/product.service";
import { getStores } from "@/services/store.service";
import { getStoresRanking } from "@/services/stores-public.service";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/lojas`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/para-lojistas`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  const [products, stores, publicStores] = await Promise.all([
    getProducts(),
    getStores(),
    getStoresRanking(100),
  ]);

  const productRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/product/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const compareRoutes: MetadataRoute.Sitemap = products
    .filter((p) => p.slug)
    .map((p) => ({
      url: `${SITE_URL}/compare/${p.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));

  const storeRoutes: MetadataRoute.Sitemap = stores
    .filter((s) => s.slug)
    .map((s) => ({
      url: `${SITE_URL}/store/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

  const publicStoreRoutes: MetadataRoute.Sitemap = publicStores
    .filter((s) => s.slug)
    .map((s) => ({
      url: `${SITE_URL}/lojas/${s.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    }));

  return [...staticRoutes, ...productRoutes, ...compareRoutes, ...storeRoutes, ...publicStoreRoutes];
}
