import { supabase } from "@/lib/supabase";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createBuyerIntelligenceServices } from "@/lib/buyer-intelligence-factory";
import { getProductBySlug } from "@/services/product.service";
import { OfferWithStore } from "@/types/offer";
import { Store } from "@/types/store";
import { OfferPriceMetrics } from "@/types/priceHistory";
import { CompareResult, CompareSummary, RankedOffer } from "@/types/compare";
import type { ProductWithRelations } from "@/types/product";
import type { RankedOfferIntelligence } from "@/src/domains/buyer-intelligence";

// Release 2.0 — Wave 1 (Quick Wins). Replaces the independent ranking
// formula this file used to compute itself (ADR-014 comment, price 50/
// availability 25/reliability 15/quality 10) with the real, already-tested
// canonical-catalog services (OfferRankingService via
// ProductIntelligenceComposer/CompareFoundationService — price 40/
// availability 20/recency 15/trust 15/quality 10) — see
// docs/product/BUYER_INTELLIGENCE_LAYER.md. This also fixes a structural
// limitation: the old getOffersByProductId(productId) only ever looked at
// offers on the exact same `products` row (which belongs to a single
// store), so cross-merchant comparison could never actually happen here.
// Going through the canonical product (Product Identity / Canonical
// Catalog) is what makes real cross-store offers appear on this page.
// CompareResult/RankedOffer/CompareSummary (types/compare.ts) are
// deliberately left unchanged — every consumer (app/compare/[slug]/page.tsx,
// CompareSummary.tsx, CompareOfferCard.tsx) keeps working without edits.

type PriceHistoryRow = {
  offer_id: string;
  price_usd: number;
  old_price_usd: number | null;
  recorded_at: string;
};

// Historical min/max per offer — unrelated to ranking, kept as-is (still the
// only place in the codebase that computes this from price_history in bulk).
async function batchPriceMetrics(offers: { id: string; price_usd: number }[]): Promise<Map<string, OfferPriceMetrics | null>> {
  const metricsMap = new Map<string, OfferPriceMetrics | null>();
  if (offers.length === 0) return metricsMap;

  const offerIds = offers.map((o) => o.id);
  const { data, error } = await supabase
    .from("price_history")
    .select("offer_id, price_usd, old_price_usd, recorded_at")
    .in("offer_id", offerIds)
    .order("recorded_at", { ascending: true });

  const historyByOffer = new Map<string, PriceHistoryRow[]>();
  if (!error) {
    for (const row of (data ?? []) as PriceHistoryRow[]) {
      const existing = historyByOffer.get(row.offer_id) ?? [];
      existing.push(row);
      historyByOffer.set(row.offer_id, existing);
    }
  } else {
    console.error(error);
  }

  for (const offer of offers) {
    const entries = historyByOffer.get(offer.id) ?? [];
    const firstEntry = entries[0] ?? null;
    const lastEntry = entries[entries.length - 1] ?? null;

    const prices = [
      ...(firstEntry?.old_price_usd != null ? [firstEntry.old_price_usd] : []),
      ...entries.map((e) => e.price_usd),
      offer.price_usd,
    ];
    const firstPrice = firstEntry?.old_price_usd ?? null;

    metricsMap.set(offer.id, {
      offerId: offer.id,
      currentPriceUSD: offer.price_usd,
      lowestPriceUSD: Math.min(...prices),
      highestPriceUSD: Math.max(...prices),
      priceChangePercent:
        firstPrice && firstPrice !== 0 ? ((offer.price_usd - firstPrice) / firstPrice) * 100 : null,
      lastPriceChangeAt: lastEntry ? lastEntry.recorded_at : null,
    });
  }

  return metricsMap;
}

async function resolveStores(storeIds: string[]): Promise<Map<string, Store>> {
  if (storeIds.length === 0) return new Map();
  const { data, error } = await supabase.from("stores").select("*").in("id", storeIds);
  if (error) {
    console.error(error);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.id as string, row as Store]));
}

async function resolveOfferExtras(offerIds: string[]): Promise<Map<string, { price_brl: number; cashback: number | null }>> {
  if (offerIds.length === 0) return new Map();
  const { data, error } = await supabase.from("offers").select("id, price_brl, cashback").in("id", offerIds);
  if (error) {
    console.error(error);
    return new Map();
  }
  return new Map((data ?? []).map((row) => [row.id as string, { price_brl: row.price_brl as number, cashback: row.cashback as number | null }]));
}

function toRankedOffers(
  ranked: RankedOfferIntelligence[],
  storesById: Map<string, Store>,
  offerExtrasById: Map<string, { price_brl: number; cashback: number | null }>,
  metricsById: Map<string, OfferPriceMetrics | null>
): RankedOffer[] {
  return ranked.map((r) => {
    const extras = offerExtrasById.get(r.offer.offerId);
    const offer: OfferWithStore = {
      id: r.offer.offerId,
      product_id: r.offer.productId,
      store_id: r.offer.storeId,
      currency: "USD",
      price_usd: r.offer.priceUSD,
      price_brl: extras?.price_brl ?? 0,
      old_price: null,
      in_stock: r.offer.inStock,
      available: r.offer.inStock,
      stock_quantity: r.offer.stockQuantity,
      condition: r.offer.condition,
      warranty: r.offer.warranty,
      cashback: extras?.cashback ?? null,
      product_url: r.offer.productUrl,
      created_at: r.offer.updatedAt,
      updated_at: r.offer.updatedAt,
      store: storesById.get(r.offer.storeId) ?? null,
    };
    return {
      offer,
      rank: r.rank,
      rankScore: r.rankScore,
      priceMetrics: metricsById.get(r.offer.offerId) ?? null,
      factors: r.factors,
    };
  });
}

function buildSummary(rankedOffers: RankedOffer[]): CompareSummary {
  if (rankedOffers.length === 0) {
    return {
      lowestPriceUSD: null,
      highestPriceUSD: null,
      absoluteDifferenceUSD: null,
      percentageDifference: null,
      maxSavingsUSD: null,
      storeCount: 0,
      availableCount: 0,
    };
  }

  const prices = rankedOffers.map((r) => r.offer.price_usd);
  const lowest = Math.min(...prices);
  const highest = Math.max(...prices);
  const diff = highest - lowest;

  return {
    lowestPriceUSD: lowest,
    highestPriceUSD: highest,
    absoluteDifferenceUSD: diff,
    percentageDifference: lowest > 0 ? (diff / lowest) * 100 : null,
    maxSavingsUSD: diff,
    storeCount: new Set(rankedOffers.map((r) => r.offer.store_id)).size,
    availableCount: rankedOffers.filter((r) => r.offer.in_stock).length,
  };
}

async function buildCompareResult(productId: string, product: ProductWithRelations): Promise<CompareResult> {
  const { productComposer } = createBuyerIntelligenceServices(getSupabaseServiceClient());
  const { comparison } = await productComposer.composeForProduct(productId);

  if (!comparison) {
    // No canonical link yet (Product Identity, Shadow Mode) — nothing to
    // compare across stores. Empty result, never an error.
    return { product, offers: [], summary: buildSummary([]) };
  }

  const storeIds = [...new Set(comparison.offers.map((o) => o.offer.storeId))];
  const offerIds = comparison.offers.map((o) => o.offer.offerId);

  const [storesById, offerExtrasById, metricsById] = await Promise.all([
    resolveStores(storeIds),
    resolveOfferExtras(offerIds),
    batchPriceMetrics(comparison.offers.map((o) => ({ id: o.offer.offerId, price_usd: o.offer.priceUSD }))),
  ]);

  const rankedOffers = toRankedOffers(comparison.offers, storesById, offerExtrasById, metricsById);
  return { product, offers: rankedOffers, summary: buildSummary(rankedOffers) };
}

// Primary entry point: compare by product slug.
export async function getProductComparisonBySlug(slug: string): Promise<CompareResult | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return buildCompareResult(product.id, product);
}

// Alternate entry point: compare by product UUID.
export async function getProductComparison(productId: string): Promise<CompareResult | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, brand:brands(*), category:categories(*)")
    .eq("id", productId)
    .maybeSingle();

  if (error) {
    console.error(error);
    return null;
  }
  if (!data) return null;

  return buildCompareResult(productId, data as ProductWithRelations);
}
