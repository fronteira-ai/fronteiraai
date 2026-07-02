import type { CanonicalProduct } from "../domain/CanonicalProduct";
import type { ICanonicalCatalogRepository } from "../repositories/ICanonicalCatalogRepository";
import type { PaginationParams } from "../types/canonical-catalog.types";
import { CanonicalProductService } from "./CanonicalProductService";
import { OfferRankingService, type OfferRankInput, type RankedCanonicalOffer } from "./OfferRankingService";
import { CanonicalPriceHistoryService, type CanonicalPriceAggregation } from "./CanonicalPriceHistoryService";

export interface CompareFoundationResult {
  canonicalProduct: CanonicalProduct;
  rankedOffers: RankedCanonicalOffer[];
  priceAggregation: CanonicalPriceAggregation;
  totalOffers: number;
}

const DEFAULT_PAGINATION: PaginationParams = { limit: 100, offset: 0 };

// The actual "Compare Foundation" (mission objective 3): composes offers,
// ranking, and aggregated price history for one canonical product.
// Backend-only this Wave — no page consumes it yet (confirmed with the
// CTO), but it's real, callable, and tested end-to-end.
export class CompareFoundationService {
  constructor(
    private readonly canonicalProductService: CanonicalProductService,
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly rankingService: OfferRankingService,
    private readonly priceHistoryService: CanonicalPriceHistoryService
  ) {}

  async getForSlug(
    canonicalSlug: string,
    resolveIsVerified: (storeId: string) => Promise<boolean> | boolean,
    pagination: PaginationParams = DEFAULT_PAGINATION
  ): Promise<CompareFoundationResult | null> {
    const canonicalProduct = await this.canonicalProductService.getBySlug(canonicalSlug);
    if (!canonicalProduct) return null;

    const { items: offers, total } = await this.catalogRepo.findOffersByCanonicalProductId(
      canonicalProduct.id,
      pagination
    );

    const rankInputs: OfferRankInput[] = await Promise.all(
      offers.map(async (offer) => ({ offer, isVerifiedStore: await resolveIsVerified(offer.storeId) }))
    );
    const rankedOffers = this.rankingService.rank(rankInputs);

    const priceAggregation = await this.priceHistoryService.getAggregatedPriceHistory(
      canonicalProduct.id,
      offers.map((o) => o.priceUSD)
    );

    return { canonicalProduct, rankedOffers, priceAggregation, totalOffers: total };
  }
}
