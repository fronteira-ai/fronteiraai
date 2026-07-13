import { cache } from "react";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createBuyerIntelligenceServices } from "@/lib/buyer-intelligence-factory";
import type { ProductCatalogItem } from "@/types/product";

// Release 2.0 — Wave 1 (Quick Wins). Compact "Preço Abaixo da Média" badge
// for the search results grid — service role client, same reasoning as
// app/product/[slug]/_cache.ts (reads across domains not all anon-readable).
async function getSearchIntelligenceBadges(products: ProductCatalogItem[]) {
  const { searchComposer } = createBuyerIntelligenceServices(getSupabaseServiceClient());
  return searchComposer.composeForProducts(
    products.map((p) => ({ productId: p.id, priceUSD: p.lowestPriceUSD }))
  );
}

export const getCachedSearchIntelligenceBadges = cache(getSearchIntelligenceBadges);

// Release 2.0 — Wave 4 (Trust Experience, Objetivo 5 — Search Results
// compact version). Batched by the store ids already resolved by
// searchEverything (lowestPriceStoreId) — never a per-card query.
async function getSearchTrustBadges(products: ProductCatalogItem[]) {
  const { trustComposer } = createBuyerIntelligenceServices(getSupabaseServiceClient());
  const storeIds = products
    .map((p) => p.lowestPriceStoreId)
    .filter((id): id is string => typeof id === "string");
  return trustComposer.composeCompactForStores(storeIds);
}

export const getCachedSearchTrustBadges = cache(getSearchTrustBadges);
