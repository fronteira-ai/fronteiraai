import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { PriceIntelligenceService } from "@/src/domains/market-insights";
import type { SearchIntelligenceBadge } from "../types/buyer-intelligence.types";

/**
 * Release 2.0 — Wave 1. Compact version of the "Preço Justo" signal for
 * result-grid contexts (search, catalog) where the full PriceStatistics text
 * doesn't fit — a single boolean badge, still backed by the same
 * PriceIntelligenceService.getStatistics used everywhere else. Batches by
 * product id list, one canonical lookup + one statistics call per product in
 * parallel (Promise.allSettled) rather than serially — still bounded by the
 * page size (8-24 results), never an unbounded fan-out.
 */
export interface SearchIntelligenceInput {
  productId: string;
  /** The price already resolved for this product on the results grid (e.g.
   * `ProductCatalogItem.lowestPriceUSD`) — this composer compares against
   * that, it never fetches a second, potentially different offer price. */
  priceUSD: number | null;
}

export class SearchIntelligenceComposer {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly priceIntelligenceService: PriceIntelligenceService
  ) {}

  async composeForProducts(inputs: SearchIntelligenceInput[]): Promise<Map<string, SearchIntelligenceBadge>> {
    const entries = await Promise.allSettled(
      inputs.map(async ({ productId, priceUSD }): Promise<[string, SearchIntelligenceBadge]> => {
        if (priceUSD === null) return [productId, { productId, belowAveragePrice: false }];

        const canonicalProductId = await this.catalogRepo.findCanonicalProductIdByProductId(productId);
        if (!canonicalProductId) return [productId, { productId, belowAveragePrice: false }];

        const statistics = await this.priceIntelligenceService.getStatistics(canonicalProductId);
        const belowAveragePrice = !!statistics && priceUSD < statistics.medianPriceUSD * 0.9;

        return [productId, { productId, belowAveragePrice }];
      })
    );

    const map = new Map<string, SearchIntelligenceBadge>();
    for (const entry of entries) {
      if (entry.status === "fulfilled") map.set(entry.value[0], entry.value[1]);
    }
    return map;
  }
}
