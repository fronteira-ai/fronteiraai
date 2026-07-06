import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import { VolatilityService, VolatilityClass, ChangeType, type IMarketChangeRepository } from "@/src/domains/realtime-commerce";
import type {
  CanonicalVolatilityProfile,
  CategoryVolatilityProfile,
  MerchantAggressivenessProfile,
} from "../types/volatility-rollup.types";

const DEFAULT_WINDOW_DAYS = 30;
const OFFER_FETCH_LIMIT = 500;
/** Bounded sample of canonical products averaged for a category rollup —
 * same reasoning as every other bounded sample in this codebase
 * (ConnectorObservabilityService's volatility sample, MarketPulseService's
 * breakdown sample): representative without being O(category size). */
const CATEGORY_SAMPLE_SIZE = 20;
const MERCHANT_CHANGE_SAMPLE_LIMIT = 5000;

/** Mirrors VolatilityEngine's own classification bands (realtime-commerce)
 * — not a second volatility algorithm, just the same discrete thresholds
 * applied to an averaged score so a rollup can be read the same way a
 * single product's score already is. */
function classifyVolatility(score: number): VolatilityClass {
  if (score >= 80) return VolatilityClass.MuitoVolatil;
  if (score >= 60) return VolatilityClass.Volatil;
  if (score >= 40) return VolatilityClass.Moderado;
  if (score >= 20) return VolatilityClass.Estavel;
  return VolatilityClass.MuitoEstavel;
}

/**
 * Objective 6 (Volatility Engine) — rolls up the existing per-product
 * VolatilityEngine score (realtime-commerce, Program A Wave 2) to levels it
 * doesn't compute on its own: canonical product (across every store selling
 * it), category, and merchant. No statistics reinvented here — frequency/
 * amplitude/velocity/persistence stay exactly where they already live.
 */
export class VolatilityRollupService {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly volatilityService: VolatilityService,
    private readonly changeRepo: IMarketChangeRepository
  ) {}

  async getCanonicalVolatility(
    canonicalProductId: string,
    windowDays: number = DEFAULT_WINDOW_DAYS
  ): Promise<CanonicalVolatilityProfile | null> {
    const { items } = await this.catalogRepo.findOffersByCanonicalProductId(canonicalProductId, {
      limit: OFFER_FETCH_LIMIT,
      offset: 0,
    });
    const productIds = [...new Set(items.map((o) => o.productId))];
    if (productIds.length === 0) return null;

    const scores = await Promise.all(productIds.map((id) => this.volatilityService.computeForProduct(id, windowDays)));
    const scored = scores.filter((s) => s.sampleSize >= 2);

    const score = scored.length > 0 ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length) : 0;

    return {
      canonicalProductId,
      score,
      classification: classifyVolatility(score),
      productsScored: scored.length,
    };
  }

  async getCategoryVolatility(
    categoryId: string,
    windowDays: number = DEFAULT_WINDOW_DAYS
  ): Promise<CategoryVolatilityProfile> {
    const canonicalProducts = await this.catalogRepo.findByCategoryId(categoryId);
    const sample = canonicalProducts.slice(0, CATEGORY_SAMPLE_SIZE);

    const profiles = await Promise.all(sample.map((cp) => this.getCanonicalVolatility(cp.id, windowDays)));
    const valid = profiles.filter((p): p is CanonicalVolatilityProfile => p !== null && p.productsScored > 0);

    const averageScore =
      valid.length > 0 ? Math.round(valid.reduce((sum, p) => sum + p.score, 0) / valid.length) : 0;

    return { categoryId, averageScore, canonicalProductsScored: valid.length };
  }

  async getMerchantAggressiveness(
    storeId: string,
    windowDays: number = DEFAULT_WINDOW_DAYS
  ): Promise<MerchantAggressivenessProfile> {
    const to = new Date();
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const changes = await this.changeRepo.listForStore(storeId, from, to, MERCHANT_CHANGE_SAMPLE_LIMIT);

    const priceChanges = changes.filter(
      (c) => c.changeType === ChangeType.PriceIncreased || c.changeType === ChangeType.PriceDecreased
    );
    const drops = priceChanges.filter((c) => c.changeType === ChangeType.PriceDecreased).length;

    return {
      storeId,
      priceDropShare: priceChanges.length > 0 ? drops / priceChanges.length : 0,
      priceChangeCount: priceChanges.length,
      windowDays,
    };
  }
}
