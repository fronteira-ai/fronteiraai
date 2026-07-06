import type { ICanonicalCatalogRepository, CanonicalPriceHistoryService } from "@/src/domains/canonical-catalog";
import { ChangeType, type IMarketChangeRepository } from "@/src/domains/realtime-commerce";
import type { VolatilityRollupService } from "./VolatilityRollupService";
import type { PriceHistoryProfile } from "../types/price-history.types";

const DEFAULT_WINDOW_DAYS = 30;
const OFFER_FETCH_LIMIT = 500;

/**
 * Objective 4 (Price History API) — internal composition only, never a
 * public endpoint (per the Wave brief). Reuses `CanonicalPriceHistoryService`
 * (canonical-catalog) for last price/first seen/trend — see the `lastPriceUSD`/
 * `firstSeenAt` fields added to `CanonicalPriceAggregation` this Wave — and
 * `VolatilityRollupService` (this domain) for stability, inverted. The only
 * genuinely new computation here is change frequency, a plain rate over
 * `market_changes` that neither existing service exposes.
 */
export class PriceHistoryQueryService {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly priceHistoryService: CanonicalPriceHistoryService,
    private readonly volatilityRollup: VolatilityRollupService,
    private readonly changeRepo: IMarketChangeRepository
  ) {}

  async getProfile(canonicalProductId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<PriceHistoryProfile | null> {
    const { items } = await this.catalogRepo.findOffersByCanonicalProductId(canonicalProductId, {
      limit: OFFER_FETCH_LIMIT,
      offset: 0,
    });

    const currentPrices = items.filter((o) => o.inStock).map((o) => o.priceUSD);
    const aggregation = await this.priceHistoryService.getAggregatedPriceHistory(canonicalProductId, currentPrices);

    if (aggregation.lastPriceUSD === null && aggregation.firstSeenAt === null) return null;

    const [changeFrequencyPerWeek, volatility] = await Promise.all([
      this.computeChangeFrequencyPerWeek(items.map((o) => o.productId), windowDays),
      this.volatilityRollup.getCanonicalVolatility(canonicalProductId, windowDays),
    ]);

    return {
      canonicalProductId,
      lastPriceUSD: aggregation.lastPriceUSD,
      lastUpdatedAt: aggregation.lastUpdatedAt,
      firstSeenAt: aggregation.firstSeenAt,
      trend: aggregation.trend,
      changeFrequencyPerWeek,
      stabilityScore: volatility && volatility.productsScored > 0 ? 100 - volatility.score : null,
    };
  }

  private async computeChangeFrequencyPerWeek(productIds: string[], windowDays: number): Promise<number> {
    const uniqueProductIds = [...new Set(productIds)];
    if (uniqueProductIds.length === 0) return 0;

    const to = new Date();
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const changesPerProduct = await Promise.all(uniqueProductIds.map((id) => this.changeRepo.listForProduct(id, from, to)));

    const priceChangeCount = changesPerProduct
      .flat()
      .filter((c) => c.changeType === ChangeType.PriceIncreased || c.changeType === ChangeType.PriceDecreased).length;

    const weeks = windowDays / 7;
    return weeks > 0 ? priceChangeCount / weeks : 0;
  }
}
