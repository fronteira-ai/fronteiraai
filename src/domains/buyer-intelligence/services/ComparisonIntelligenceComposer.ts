import type {
  CompareFoundationService,
  ICanonicalCatalogRepository,
  CanonicalOfferView,
} from "@/src/domains/canonical-catalog";
import type { PriceIntelligenceService } from "@/src/domains/market-insights";
import type { FreshnessService } from "@/src/domains/realtime-commerce";
import type { IMerchantStoreLinkRepository } from "@/src/domains/merchant-ownership/repositories/IMerchantStoreLinkRepository";
import type { BadgeService } from "@/src/domains/trust/services/BadgeService";
import type { ComparisonIntelligenceBundle, RankedOfferIntelligence } from "../types/buyer-intelligence.types";

const PAGINATION = { limit: 100, offset: 0 };

/**
 * Release 2.0 — Wave 1. Composition only — every number here is produced by
 * an existing, already-tested service (CompareFoundationService,
 * PriceIntelligenceService, FreshnessService, BadgeService). This class adds
 * no scoring, no threshold, no new algorithm.
 *
 * Resolves store verification in one batched pass (via
 * IMerchantStoreLinkRepository.findMerchantIdsByStoreIds +
 * BadgeService.getActiveBadges) BEFORE calling
 * CompareFoundationService.getForSlug — its `resolveIsVerified` callback is
 * then a synchronous map lookup, not a second query per offer. This is the
 * fix for the N+1 risk BUYER_INTELLIGENCE_LAYER.md §6 named up front.
 */
export class ComparisonIntelligenceComposer {
  constructor(
    private readonly compareFoundationService: CompareFoundationService,
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly priceIntelligenceService: PriceIntelligenceService,
    private readonly freshnessService: FreshnessService,
    private readonly merchantStoreLinkRepo: IMerchantStoreLinkRepository,
    private readonly badgeService: BadgeService
  ) {}

  async composeForSlug(canonicalSlug: string): Promise<ComparisonIntelligenceBundle | null> {
    const canonicalProduct = await this.catalogRepo.findBySlug(canonicalSlug);
    if (!canonicalProduct) return null;

    const { items: offers } = await this.catalogRepo.findOffersByCanonicalProductId(canonicalProduct.id, PAGINATION);

    const isVerifiedByStoreId = await this.resolveVerification(offers);
    const resolveIsVerified = (storeId: string) => isVerifiedByStoreId.get(storeId) ?? false;

    const result = await this.compareFoundationService.getForSlug(canonicalSlug, resolveIsVerified, PAGINATION);
    if (!result) return null;

    const errors: ComparisonIntelligenceBundle["errors"] = {};

    const freshnessByOfferId = await this.resolveFreshness(offers, errors);

    const [priceStatistics, savingsOpportunity] = await Promise.all([
      this.priceIntelligenceService.getStatistics(canonicalProduct.id).catch((err) => {
        errors.priceStatistics = err instanceof Error ? err.message : String(err);
        return null;
      }),
      this.priceIntelligenceService.getSavingsOpportunity(canonicalProduct.id).catch((err) => {
        errors.savingsOpportunity = err instanceof Error ? err.message : String(err);
        return null;
      }),
    ]);

    const rankedOffers: RankedOfferIntelligence[] = result.rankedOffers.map((ranked) => ({
      offer: ranked.offer,
      rank: ranked.rank,
      rankScore: ranked.rankScore,
      factors: ranked.factors,
      isVerifiedStore: resolveIsVerified(ranked.offer.storeId),
      freshness: freshnessByOfferId.get(ranked.offer.offerId) ?? null,
    }));

    return {
      canonicalProduct: result.canonicalProduct,
      offers: rankedOffers,
      totalOffers: result.totalOffers,
      priceAggregation: result.priceAggregation,
      priceStatistics,
      savingsOpportunity,
      errors,
    };
  }

  private async resolveVerification(offers: CanonicalOfferView[]): Promise<Map<string, boolean>> {
    const storeIds = [...new Set(offers.map((o) => o.storeId))];
    const merchantIdByStoreId = await this.merchantStoreLinkRepo.findMerchantIdsByStoreIds(storeIds);
    const merchantIds = [...new Set(merchantIdByStoreId.values())];
    const badgeByMerchantId = await this.badgeService.getActiveBadges(merchantIds);

    const result = new Map<string, boolean>();
    for (const storeId of storeIds) {
      const merchantId = merchantIdByStoreId.get(storeId);
      result.set(storeId, merchantId ? badgeByMerchantId.has(merchantId) : false);
    }
    return result;
  }

  private async resolveFreshness(
    offers: CanonicalOfferView[],
    errors: ComparisonIntelligenceBundle["errors"]
  ): Promise<Map<string, Awaited<ReturnType<FreshnessService["computeForOffer"]>>>> {
    const entries = await Promise.allSettled(
      offers.map(async (offer) => {
        const score = await this.freshnessService.computeForOffer(offer.offerId, new Date(offer.updatedAt));
        return [offer.offerId, score] as const;
      })
    );

    const map = new Map<string, Awaited<ReturnType<FreshnessService["computeForOffer"]>>>();
    for (const entry of entries) {
      if (entry.status === "fulfilled") {
        map.set(entry.value[0], entry.value[1]);
      } else if (!errors.freshness) {
        errors.freshness = entry.reason instanceof Error ? entry.reason.message : String(entry.reason);
      }
    }
    return map;
  }
}
