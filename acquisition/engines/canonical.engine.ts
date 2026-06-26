import type { NormalizedOffer } from "../types/pipeline";

export interface CanonicalMatch {
  productSlug: string;
  confidence: number;
  strategy: "exact-slug" | "fuzzy-name" | "external-id";
}

export class CanonicalProductEngine {
  findCanonical(offer: NormalizedOffer, candidates: string[]): CanonicalMatch | null {
    const slug = offer.product.slug;

    if (candidates.includes(slug)) {
      return { productSlug: slug, confidence: 1.0, strategy: "exact-slug" };
    }

    // Phase 2: fuzzy name matching and AI-based canonicalization will go here.
    // For now, only exact-slug matching is implemented.
    return null;
  }
}
