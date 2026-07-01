import { ProductIdentityEngine } from "../domain/ProductIdentityEngine";
import type { IProductCandidateRepository } from "../repositories/IProductCandidateRepository";
import type { IProductIdentityMatchLogRepository } from "../repositories/IProductIdentityMatchLogRepository";
import type { EvaluableProduct } from "../types/product-identity.types";

// Shadow Mode orchestration (RELEASE_1_7_BLUEPRINT.md Chapter 8 / CTO
// approval): evaluateAndLog never throws — any failure (candidate lookup,
// engine, or logging) is caught and logged here, so a caller (e.g. the
// connectors sync pipeline) can invoke this without any try/catch of its own
// affecting real sync behavior. This is what makes Shadow Mode structurally
// safe rather than a documentation promise.
export class ProductIdentityService {
  private readonly engine = new ProductIdentityEngine();

  constructor(
    private readonly candidateRepo: IProductCandidateRepository,
    private readonly matchLogRepo: IProductIdentityMatchLogRepository
  ) {}

  async evaluateAndLog(
    product: EvaluableProduct,
    storeSlug: string,
    connectorId: string,
    batchId: string
  ): Promise<void> {
    const startedAt = Date.now();
    try {
      const candidates = await this.candidateRepo.findByBrandSlug(product.brandSlug);
      const result = this.engine.evaluate(product, candidates);

      await this.matchLogRepo.record({
        batchId,
        connectorId,
        candidateSlug: product.slug,
        candidateStoreSlug: storeSlug,
        suggestedProductId: result.candidateProductId,
        suggestedProductSlug: result.candidateProductSlug,
        algorithmVersion: result.algorithmVersion,
        confidenceScore: result.confidence,
        tier: result.tier,
        strategy: result.strategy,
        matchedAttributes: result.matchedAttributes,
        mismatchedAttributes: result.mismatchedAttributes,
        penalties: result.penalties,
        finalDecision: result.suggestedDecision,
        explainabilityReason: result.explainabilityReason,
        processingTimeMs: Date.now() - startedAt,
      });
    } catch (err) {
      console.error("[ProductIdentityService.evaluateAndLog]", String(err));
    }
  }
}
