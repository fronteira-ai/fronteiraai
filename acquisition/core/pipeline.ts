import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawOffer } from "../types/raw";
import type { PipelineContext, PipelineResult, IPipelineStage } from "../types/pipeline";
import { initMetrics, printReport } from "../observability/metrics";
import { ValidationEngine } from "../engines/validation.engine";
import { NormalizationEngine } from "../engines/normalization.engine";
import { DeduplicationEngine } from "../engines/deduplication.engine";
import { MediaPipeline } from "../engines/media.engine";
import { CatalogWriter } from "../persistence/catalog.writer";

export interface PipelineOptions {
  dryRun?: boolean;
  skipMedia?: boolean;
  verbose?: boolean;
}

export class AcquisitionPipeline {
  private readonly stages: IPipelineStage[];

  constructor(options: PipelineOptions = {}) {
    const { skipMedia = false } = options;

    this.stages = [
      new ValidationEngine(),
      new NormalizationEngine(),
      new DeduplicationEngine(),
      ...(skipMedia ? [] : [new MediaPipeline()]),
      new CatalogWriter(),
    ];
  }

  async run(
    connectorId: string,
    items: RawOffer[],
    supabase: SupabaseClient,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    const { dryRun = false, verbose = false } = options;
    const batchId = `${connectorId}-${Date.now()}`;

    let ctx: PipelineContext = {
      connectorId,
      batchId,
      dryRun,
      supabase,
      raw: items,
      validated: [],
      normalized: [],
      deduplicated: [],
      persisted: [],
      metrics: initMetrics(connectorId, batchId),
      errors: [],
    };

    ctx.metrics.totals.received = items.length;

    if (verbose) {
      console.log(`\n[pipeline] Starting ${connectorId} — ${items.length} items | dryRun=${dryRun}`);
    }

    for (const stage of this.stages) {
      if (verbose) console.log(`[pipeline] Stage: ${stage.name}`);
      ctx = await stage.execute(ctx);
    }

    ctx.metrics.completedAt = new Date().toISOString();
    ctx.metrics.durationMs =
      new Date(ctx.metrics.completedAt).getTime() - new Date(ctx.metrics.startedAt).getTime();

    if (verbose) printReport(ctx);

    return {
      batchId,
      connectorId,
      dryRun,
      success: ctx.errors.length === 0,
      metrics: ctx.metrics,
      errors: ctx.errors,
      persisted: ctx.persisted,
    };
  }
}
