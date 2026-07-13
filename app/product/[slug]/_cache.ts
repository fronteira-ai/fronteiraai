import { cache } from "react";
import { getProductBySlug, getRelatedProducts } from "@/services/product.service";
import { getOffersByProduct } from "@/services/offer.service";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createBuyerIntelligenceServices } from "@/lib/buyer-intelligence-factory";

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
