import type { PipelineContext } from "../../types/pipeline.types";
import type { ISyncStage } from "./ISyncStage";
import { recordStage, recordError } from "../metrics";

// Mission Ω-Canonical Integration. Runs after CatalogWriteStage, same shape
// as MarketChangeDetectionStage (a downstream enrichment stage reading
// ctx.persisted) — never the reverse dependency. Closes the architectural
// gap the Mission Ω-COMPARISON AUDIT found: the Sync Pipeline used to end
// at products/offers/price_history, leaving canonical_product_id NULL
// forever unless a human ran canonical-catalog-bootstrap.ts by hand.
//
// Deliberately CHEAP and bounded per item — bootstrapFromProduct()
// (idempotent, findOrCreateBySlug) + linkOffer() (idempotent, plain
// UPDATE) are O(1) DB round trips, safe to stay in the Sync Pipeline's
// critical path. The expensive, variable-cost step — Product Identity's
// suggestMergesFor() — is deliberately NOT called here (Fase 1 decision):
// this stage only ENQUEUES the canonical product into
// canonical_suggestion_outbox; a separate, time-decoupled cron
// (CanonicalSuggestionSweepService) is the only caller of suggestMergesFor.
//
// Every write here is best-effort relative to the item's core persistence,
// which already succeeded in CatalogWriteStage before this stage ever
// runs: a failure here never un-persists a product/offer/price_history row
// (mission's protected guarantee) — it only means this one item's
// canonical link/suggestion-enqueue is missing until the next sync
// self-heals it (bootstrapFromProduct/linkOffer/enqueue are all
// idempotent, so re-running this stage for the same item later is safe
// and convergent).
export class CanonicalLinkStage implements ISyncStage {
  readonly name = "canonical-link";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();

    if (ctx.dryRun || !ctx.canonicalProductService || !ctx.canonicalCatalogRepo || !ctx.canonicalSuggestionOutboxRepo) {
      recordStage(ctx, this.name, startedAt, 0, 0, ctx.persisted.length);
      return ctx;
    }

    const canonicalProductService = ctx.canonicalProductService;
    const canonicalCatalogRepo = ctx.canonicalCatalogRepo;
    const outboxRepo = ctx.canonicalSuggestionOutboxRepo;
    const source = `${ctx.connectorId}:${ctx.batchId}`;

    let offersProcessed = 0;
    let notEligible = 0;
    let canonicalCreated = 0;
    let canonicalReused = 0;
    let linksSucceeded = 0;
    let bootstrapFailures = 0;
    let linkFailures = 0;
    let enqueueFailures = 0;
    let enqueued = 0;

    for (const result of ctx.persisted) {
      if ((result.action !== "created" && result.action !== "updated") || !result.offerId || !result.productId) {
        notEligible++;
        continue;
      }
      offersProcessed++;

      let canonicalId: string | null = null;

      try {
        const product = await ctx.catalogRepo.findProductById(result.productId);
        if (!product) {
          bootstrapFailures++;
          recordError(ctx, this.name, `product ${result.productId} not found after write`, result.productSlug);
          continue;
        }

        const canonical = await canonicalProductService.bootstrapFromProduct({
          slug: product.slug,
          name: product.name,
          brandId: product.brandId,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl,
          specifications: product.specifications,
        });
        // Approximation, not an exact "was this INSERT vs SELECT" flag —
        // findOrCreateBySlug doesn't report that today, and this Mission
        // does not modify canonical-catalog/'s public API to add it
        // (kept strictly to connectors/ + wiring, per Fase 1 scope).
        // Only false-negative risk (a genuinely new row misclassified as
        // "reused"), never false-positive — acceptable for an observability
        // counter, documented here and in the delivery report.
        if (canonical.createdAt === canonical.updatedAt) canonicalCreated++;
        else canonicalReused++;
        canonicalId = canonical.id;
      } catch (err) {
        bootstrapFailures++;
        recordError(ctx, this.name, `bootstrapFromProduct failed: ${String(err)}`, result.productSlug);
        continue;
      }

      try {
        await canonicalCatalogRepo.linkOffer(result.offerId, canonicalId);
        linksSucceeded++;
      } catch (err) {
        linkFailures++;
        recordError(ctx, this.name, `linkOffer failed: ${String(err)}`, result.productSlug);
        // Not linked — enqueuing a suggestion for it would be premature
        // (nothing new to compare yet from this item's perspective); skip
        // to the next item. Self-heals on the next sync of the same offer.
        continue;
      }

      try {
        await outboxRepo.enqueue(canonicalId, source);
        enqueued++;
      } catch (err) {
        enqueueFailures++;
        recordError(ctx, this.name, `outbox enqueue failed: ${String(err)}`, result.productSlug);
        // Link already succeeded and is durable — a missed enqueue only
        // delays this canonical product's next merge-suggestion pass
        // (self-heals whenever it's next linked, or via a future manual
        // reconciliation), it never leaves canonical_product_id unset.
      }
    }

    recordStage(ctx, this.name, startedAt, linksSucceeded, bootstrapFailures + linkFailures, notEligible, {
      offersProcessed,
      canonicalCreated,
      canonicalReused,
      linksSucceeded,
      bootstrapFailures,
      linkFailures,
      enqueued,
      enqueueFailures,
    });

    return ctx;
  }
}
