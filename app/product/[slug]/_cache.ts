import { cache } from "react";
import { getProductBySlug, getRelatedProducts } from "@/services/product.service";
import { getOffersByProduct } from "@/services/offer.service";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createBuyerIntelligenceServices } from "@/lib/buyer-intelligence-factory";
import type { ComparisonIntelligenceBundle } from "@/src/domains/buyer-intelligence";

export const getCachedProduct = cache(getProductBySlug);
export const getCachedOffers = cache(getOffersByProduct);
export const getCachedRelatedProducts = cache(getRelatedProducts);

// Release 2.0 — Wave 1 (Quick Wins). Service role client (same pattern as
// stores-public.service.ts): reads across canonical-catalog/market-insights/
// realtime-commerce/trust, some of which aren't anon-readable. Server-only —
// never imported by a Client Component.
async function getProductIntelligence(productId: string) {
  const { productComposer } = createBuyerIntelligenceServices(getSupabaseServiceClient());
  return productComposer.composeForProduct(productId);
}

export const getCachedIntelligence = cache(getProductIntelligence);

// Release 2.0 — Wave 2 (Best Deal). Takes the ComparisonIntelligenceBundle
// getCachedIntelligence already fetched — never re-derives it — so
// BestDealComposer really does only "combine responses" per the mission,
// with no duplicate query. The store-name lookup here is the same kind of
// small glue query services/compare.service.ts already does (resolveStores)
// — the domain composer itself never touches the `stores` table.
async function getProductBestDeal(comparison: ComparisonIntelligenceBundle | null) {
  if (!comparison) return { bestDeal: null, storeName: null };

  const client = getSupabaseServiceClient();
  const { bestDealComposer } = createBuyerIntelligenceServices(client);
  const bestDeal = await bestDealComposer.compose(comparison);
  if (!bestDeal) return { bestDeal: null, storeName: null };

  const { data: store } = await client
    .from("stores")
    .select("name")
    .eq("id", bestDeal.recommendedOffer.offer.storeId)
    .maybeSingle();

  return { bestDeal, storeName: (store?.name as string | undefined) ?? bestDeal.recommendedOffer.offer.storeSlug };
}

export const getCachedBestDeal = cache(getProductBestDeal);

// Release 2.0 — Wave 3 (Should I Buy Now). Same reuse discipline as
// getProductBestDeal — takes the bundle getCachedIntelligence already
// fetched, no duplicate query. `comparison === null` (no canonical link
// yet, Shadow Mode) returns null here too — there is nothing to reason
// about yet, same graceful-omission convention as every other card.
async function getProductPurchaseTiming(comparison: ComparisonIntelligenceBundle | null) {
  if (!comparison) return null;
  const { purchaseTimingComposer } = createBuyerIntelligenceServices(getSupabaseServiceClient());
  return purchaseTimingComposer.compose(comparison);
}

export const getCachedPurchaseTiming = cache(getProductPurchaseTiming);
