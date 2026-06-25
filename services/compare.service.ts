import { supabase } from "@/lib/supabase";
import { getProductBySlug } from "@/services/product.service";
import { OfferWithStore } from "@/types/offer";
import { OfferPriceMetrics } from "@/types/priceHistory";
import { CompareResult, CompareSummary, RankedOffer } from "@/types/compare";

// Raw row shape returned by the price_history batch query
type PriceHistoryRow = {
  offer_id: string;
  price_usd: number;
  old_price_usd: number | null;
  recorded_at: string;
};

// Fetches price_history for all offers in a single query, then computes
// OfferPriceMetrics for each — avoids N queries that getOfferPriceMetrics()
// would require when called per offer.
async function batchPriceMetrics(
  offers: OfferWithStore[]
): Promise<Map<string, OfferPriceMetrics | null>> {
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

    // Include the original price (before the first tracked change) so that
    // lowestPriceUSD/highestPriceUSD capture the full historical range.
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
        firstPrice && firstPrice !== 0
          ? ((offer.price_usd - firstPrice) / firstPrice) * 100
          : null,
      lastPriceChangeAt: lastEntry ? lastEntry.recorded_at : null,
    });
  }

  return metricsMap;
}

// Offer Ranking algorithm (ADR-014): composite score 0–100.
// Weights: price 50, availability 25, store reliability 15, listing quality 10.
function computeRankScore(
  offer: OfferWithStore,
  lowestPrice: number,
  avgStoreRating: number
): number {
  // Price (50): cheapest gets 50; others scale proportionally.
  const priceScore = offer.price_usd > 0 ? 50 * (lowestPrice / offer.price_usd) : 0;

  // Availability (25)
  const availabilityScore = offer.in_stock ? 25 : 0;

  // Store reliability (15): rating 0-5 → 0-15. Null gets average so that a
  // new store without reviews isn't penalised as if it had the worst rating.
  const rating = offer.store?.rating ?? avgStoreRating;
  const reliabilityScore = (Math.max(0, Math.min(5, rating)) / 5) * 15;

  // Listing quality (10): proportion of informative fields that are filled.
  const qualityFields = [
    offer.warranty,
    offer.condition,
    offer.product_url,
    offer.store?.phone,
    offer.store?.whatsapp,
    offer.store?.email,
    offer.store?.website,
    offer.store?.opening_hours,
  ];
  const filledCount = qualityFields.filter(Boolean).length;
  const qualityScore = (filledCount / qualityFields.length) * 10;

  return Math.round(priceScore + availabilityScore + reliabilityScore + qualityScore);
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

// Fetches all offers for a product (with store join) in one query.
async function getOffersByProductId(productId: string): Promise<OfferWithStore[]> {
  const { data, error } = await supabase
    .from("offers")
    .select("*, store:stores(*)")
    .eq("product_id", productId);

  if (error) {
    console.error(error);
    return [];
  }

  return data as OfferWithStore[];
}

async function buildCompareResult(
  productId: string,
  product: import("@/types/product").ProductWithRelations
): Promise<CompareResult> {
  const offers = await getOffersByProductId(productId);

  const metricsMap = await batchPriceMetrics(offers);

  // Compute average store rating (for stores without a rating).
  const ratings = offers
    .map((o) => o.store?.rating)
    .filter((r): r is number => typeof r === "number");
  const avgRating =
    ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 3.5;

  const lowestPrice =
    offers.length > 0 ? Math.min(...offers.map((o) => o.price_usd)) : 0;

  const rankedOffers: RankedOffer[] = offers
    .map((offer) => ({
      offer,
      rank: 0, // set after sorting
      rankScore: computeRankScore(offer, lowestPrice, avgRating),
      priceMetrics: metricsMap.get(offer.id) ?? null,
    }))
    .sort((a, b) => b.rankScore - a.rankScore)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    product,
    offers: rankedOffers,
    summary: buildSummary(rankedOffers),
  };
}

// Primary entry point: compare by product slug.
export async function getProductComparisonBySlug(
  slug: string
): Promise<CompareResult | null> {
  const product = await getProductBySlug(slug);
  if (!product) return null;
  return buildCompareResult(product.id, product);
}

// Alternate entry point: compare by product UUID.
export async function getProductComparison(
  productId: string
): Promise<CompareResult | null> {
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

  return buildCompareResult(
    productId,
    data as import("@/types/product").ProductWithRelations
  );
}
