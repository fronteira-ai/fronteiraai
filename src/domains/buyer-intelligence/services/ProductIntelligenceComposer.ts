import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { MarketplaceMemoryService } from "@/src/domains/marketplace-memory";
import type { ComparisonIntelligenceComposer } from "./ComparisonIntelligenceComposer";
import type { ProductIntelligenceBundle } from "../types/buyer-intelligence.types";

/**
 * Release 2.0 — Wave 1. Thin wrapper around ComparisonIntelligenceComposer —
 * a product page starts from a raw `products.id`, not a canonical slug, so
 * this resolves that one extra hop (Shadow Mode: the link may not exist yet,
 * which is not an error, just an empty bundle).
 *
 * Mission 03 (Decision Engine) added the `facts` read — Marketplace Memory
 * facts are keyed by canonical_product_id, which the canonical bootstrap
 * assigns to nearly every product (1:1 when unmerged), unlike `comparison`
 * which additionally needs CompareFoundationService to resolve real offers.
 * Facts are therefore fetched as soon as the canonical link resolves, never
 * gated on `comparison` being non-null — a product's specifications don't
 * require a cross-merchant match to be worth showing.
 */
export class ProductIntelligenceComposer {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly comparisonComposer: ComparisonIntelligenceComposer,
    private readonly marketplaceMemoryService: MarketplaceMemoryService
  ) {}

  async composeForProduct(productId: string): Promise<ProductIntelligenceBundle> {
    const canonicalProductId = await this.catalogRepo.findCanonicalProductIdByProductId(productId);
    if (!canonicalProductId) return { comparison: null, facts: [] };

    const [canonicalProduct, facts] = await Promise.all([
      this.catalogRepo.findById(canonicalProductId),
      this.marketplaceMemoryService.getFactsForProduct(canonicalProductId),
    ]);
    if (!canonicalProduct) return { comparison: null, facts };

    const comparison = await this.comparisonComposer.composeForSlug(canonicalProduct.canonicalSlug);
    return { comparison, facts };
  }
}
