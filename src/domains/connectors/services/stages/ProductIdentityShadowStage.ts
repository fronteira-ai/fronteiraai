import type { PipelineContext } from "../../types/pipeline.types";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

// Wave 3 — Shadow Mode (CTO approval, RELEASE_1_7_BLUEPRINT.md Chapter 8):
// evaluates a fuzzy Product Identity match for every "new" item and logs it,
// but never changes ctx.deduplicated/ctx.persisted — no product is merged,
// no slug changes, no offer is reassigned. Only items already classified
// "new" by DeduplicationStage are candidates: "update"/"skip" items already
// matched an existing product by exact slug, so their identity is settled.
export class ProductIdentityShadowStage implements ISyncStage {
  readonly name = "product-identity-shadow";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const candidates = ctx.deduplicated.filter((item) => item.status === "new");

    for (const item of candidates) {
      try {
        await ctx.productIdentityService.evaluateAndLog(
          {
            slug: item.normalized.product.slug,
            name: item.normalized.product.name,
            brandSlug: item.normalized.product.brandSlug,
            categorySlug: item.normalized.product.categorySlug,
            specifications: item.normalized.product.specifications,
          },
          item.normalized.offer.storeSlug,
          ctx.connectorId,
          ctx.batchId
        );
      } catch (err) {
        // Structurally safe by construction: this catch (and the one already
        // inside ProductIdentityService.evaluateAndLog) means a Shadow Mode
        // failure is recorded as metadata only, never propagated to the real
        // sync outcome.
        recordError(ctx, this.name, String(err), item.normalized.product.slug);
      }
    }

    recordStage(ctx, this.name, startedAt, candidates.length, 0, 0);
    return ctx;
  }
}
