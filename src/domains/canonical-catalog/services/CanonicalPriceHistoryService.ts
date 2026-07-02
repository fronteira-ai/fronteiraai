import type { ICanonicalPriceHistoryRepository, CanonicalPriceHistoryPoint } from "../repositories/ICanonicalPriceHistoryRepository";

export type PriceTrend = "up" | "down" | "stable" | "unknown";

export interface CanonicalPriceAggregation {
  lowestPriceUSD: number | null;
  highestPriceUSD: number | null;
  averagePriceUSD: number | null;
  variationPercent: number | null;
  trend: PriceTrend;
  lastUpdatedAt: string | null;
}

// A change smaller than this is "stable", not "up"/"down" — avoids noisy
// trend flips from cent-level price jitter.
const TREND_TOLERANCE_PERCENT = 2;

// Pure function — exported directly so tests don't need a repository mock.
// currentOfferPricesUSD are today's live prices from `offers`, blended in
// alongside historical `price_history` points (same approach already used
// by services/compare.service.ts's batchPriceMetrics, extended here across
// every offer under a canonical product instead of just one).
export function computePriceAggregation(
  historicalPoints: CanonicalPriceHistoryPoint[],
  currentOfferPricesUSD: number[]
): CanonicalPriceAggregation {
  const allPrices = [...historicalPoints.map((p) => p.priceUSD), ...currentOfferPricesUSD];

  if (allPrices.length === 0) {
    return {
      lowestPriceUSD: null,
      highestPriceUSD: null,
      averagePriceUSD: null,
      variationPercent: null,
      trend: "unknown",
      lastUpdatedAt: null,
    };
  }

  const lowestPriceUSD = Math.min(...allPrices);
  const highestPriceUSD = Math.max(...allPrices);
  const averagePriceUSD = allPrices.reduce((sum, p) => sum + p, 0) / allPrices.length;

  const sortedByTime = [...historicalPoints].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  );
  const firstPrice = sortedByTime[0]?.priceUSD ?? null;
  const lastHistoricalPrice = sortedByTime[sortedByTime.length - 1]?.priceUSD ?? null;
  // The most recent signal is a live offer price when we have one — history
  // alone can be stale between syncs.
  const lastPrice = currentOfferPricesUSD[currentOfferPricesUSD.length - 1] ?? lastHistoricalPrice;

  const variationPercent =
    firstPrice !== null && firstPrice !== 0 && lastPrice !== null ? ((lastPrice - firstPrice) / firstPrice) * 100 : null;

  let trend: PriceTrend = "unknown";
  if (variationPercent !== null) {
    if (Math.abs(variationPercent) <= TREND_TOLERANCE_PERCENT) trend = "stable";
    else trend = variationPercent > 0 ? "up" : "down";
  }

  const lastUpdatedAt = sortedByTime[sortedByTime.length - 1]?.recordedAt ?? null;

  return { lowestPriceUSD, highestPriceUSD, averagePriceUSD, variationPercent, trend, lastUpdatedAt };
}

export class CanonicalPriceHistoryService {
  constructor(private readonly repo: ICanonicalPriceHistoryRepository) {}

  async getAggregatedPriceHistory(
    canonicalProductId: string,
    currentOfferPricesUSD: number[]
  ): Promise<CanonicalPriceAggregation> {
    const points = await this.repo.findByCanonicalProductId(canonicalProductId);
    return computePriceAggregation(points, currentOfferPricesUSD);
  }
}
