import type { ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { ComparisonIntelligenceComposer } from "./ComparisonIntelligenceComposer";
import type { ProductIntelligenceBundle } from "../types/buyer-intelligence.types";

/**
 * Release 2.0 — Wave 1. Thin wrapper around ComparisonIntelligenceComposer —
 * a product page starts from a raw `products.id`, not a canonical slug, so
 * this resolves that one extra hop (Shadow Mode: the link may not exist yet,
 * which is not an error, just an empty bundle).
 */
export class ProductIntelligenceComposer {
  constructor(
    private readonly catalogRepo: ICanonicalCatalogRepository,
    private readonly comparisonComposer: ComparisonIntelligenceComposer
  ) {}

  async composeForProduct(productId: string): Promise<ProductIntelligenceBundle> {
    const canonicalProductId = await this.catalogRepo.findCanonicalProductIdByProductId(productId);
    if (!canonicalProductId) return { comparison: null };

    const canonicalProduct = await this.catalogRepo.findById(canonicalProductId);
    if (!canonicalProduct) return { comparison: null };

    const comparison = await this.comparisonComposer.composeForSlug(canonicalProduct.canonicalSlug);
    return { comparison };
  }
}
