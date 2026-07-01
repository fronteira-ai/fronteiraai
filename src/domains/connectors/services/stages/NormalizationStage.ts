import type { NormalizedOffer, PipelineContext } from "../../types/pipeline.types";
import type { ISyncStage } from "./ISyncStage";
import { normalizeOffer } from "../../normalization/OfferNormalizer";
import { recordStage, recordError } from "../metrics";

export class NormalizationStage implements ISyncStage {
  readonly name = "normalization";

  async execute(ctx: PipelineContext): Promise<PipelineContext> {
    const startedAt = new Date().toISOString();
    const normalized: NormalizedOffer[] = [];
    let rejected = 0;

    for (const item of ctx.validated) {
      try {
        normalized.push(normalizeOffer(item));
      } catch (err) {
        rejected++;
        recordError(ctx, this.name, String(err), item);
      }
    }

    ctx.normalized = normalized;
    ctx.metrics.totals.normalized = normalized.length;
    ctx.metrics.totals.failed += rejected;
    recordStage(ctx, this.name, startedAt, normalized.length, rejected);
    return ctx;
  }
}
