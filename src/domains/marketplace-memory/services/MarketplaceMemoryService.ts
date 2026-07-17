import type { LearnedFact } from "../domain/LearnedFact";
import type { MerchantAttributePattern } from "../domain/MerchantAttributePattern";
import type { ILearnedFactRepository } from "../repositories/ILearnedFactRepository";
import type { IMerchantAttributePatternRepository } from "../repositories/IMerchantAttributePatternRepository";
import type { FactType } from "../types/enums";
import type { LearnedFactInput, MerchantAttributePatternInput } from "../types/marketplace-memory.types";

/** The "Learning Service" from docs/architecture/INCREMENTAL_ARCHITECTURE_CONSTITUTION.md,
 * Article 1 — scoped to this Mission's Foundation-only mandate: read/write
 * facts and patterns. Does NOT implement the Learning Lifecycle
 * (validation promotion, invalidation-on-drift, pattern-recurrence
 * promotion) — that orchestration is Learning Engine, a future Mission
 * ("NÃO implementa Learning Engine", this Mission's explicit restriction).
 * This class is the seam a future Learning Engine Mission builds on top
 * of, never bypasses. */
export class MarketplaceMemoryService {
  constructor(
    private readonly factRepo: ILearnedFactRepository,
    private readonly patternRepo: IMerchantAttributePatternRepository
  ) {}

  async getFactsForProduct(canonicalProductId: string): Promise<LearnedFact[]> {
    return this.factRepo.findByCanonicalProductId(canonicalProductId);
  }

  /** The read path that justifies this Mission — every product sharing the
   * same (factType, factValue), e.g. every product with
   * manufacturerCode="A3257". */
  async getProductsSharingFact(factType: FactType, factValue: string): Promise<LearnedFact[]> {
    return this.factRepo.findByTypeAndValue(factType, factValue);
  }

  async learnFact(input: LearnedFactInput): Promise<LearnedFact> {
    return this.factRepo.upsert(input);
  }

  async learnFacts(inputs: LearnedFactInput[]): Promise<LearnedFact[]> {
    const results: LearnedFact[] = [];
    for (const input of inputs) {
      results.push(await this.factRepo.upsert(input));
    }
    return results;
  }

  async getPattern(storeId: string, rawKey: string): Promise<MerchantAttributePattern | null> {
    return this.patternRepo.findByStoreAndKey(storeId, rawKey);
  }

  /** Records one more observation of a (store, rawKey) -> concept mapping —
   * increments `occurrences` on top of whatever was already stored, never
   * blind-overwrites a higher count with 1. This is storage only; deciding
   * WHEN a pattern is trustworthy enough to auto-apply is Learning Engine
   * (docs/architecture/PATTERN_LEARNING.md), not this method. */
  async observePattern(input: MerchantAttributePatternInput): Promise<MerchantAttributePattern> {
    const existing = await this.patternRepo.findByStoreAndKey(input.storeId, input.rawKey);
    const nextOccurrences = (existing?.occurrences ?? 0) + 1;
    return this.patternRepo.upsert(input, nextOccurrences);
  }
}
