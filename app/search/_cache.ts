import { cache } from "react";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createBuyerIntelligenceServices } from "@/lib/buyer-intelligence-factory";
import { createExchangeServices } from "@/lib/exchange-factory";
import type { ProductCatalogItem } from "@/types/product";
import type { MoneyPresentation } from "@/src/domains/exchange";

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

// Mission Ω-LAUNCH Fase 1 (item 3 — "Mostrar preço em US$, R$"). Same
// per-product Promise.allSettled batching as the two badge caches above —
// service role client, no new decision logic, just PricePresentationService
// (already used by app/product/[slug]/_cache.ts) applied to the price the
// results grid already resolved (ProductCatalogItem.lowestPriceUSD).
async function getSearchMoneyPresentation(products: ProductCatalogItem[]) {
  const { presentationService } = createExchangeServices(getSupabaseServiceClient());
  const map = new Map<string, MoneyPresentation>();

  const entries = await Promise.allSettled(
    products
      .filter((p) => p.lowestPriceUSD !== null)
      .map(async (p): Promise<[string, MoneyPresentation]> => [
        p.id,
        await presentationService.present({ amountUSD: p.lowestPriceUSD as number }),
      ])
  );

  for (const entry of entries) {
    if (entry.status === "fulfilled") map.set(entry.value[0], entry.value[1]);
  }
  return map;
}

export const getCachedSearchMoneyPresentation = cache(getSearchMoneyPresentation);
