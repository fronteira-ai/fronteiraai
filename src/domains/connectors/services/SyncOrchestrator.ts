import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawOffer } from "../types/raw.types";
import type { PipelineContext, PipelineResult } from "../types/pipeline.types";
import type { ICatalogRepository } from "../repositories/ICatalogRepository";
import type { IConnectorRepository } from "../repositories/IConnectorRepository";
import type { ISyncRunRepository } from "../repositories/ISyncRunRepository";
import type { ConnectorMetadata } from "../types/connector.types";
import { SyncRunStatus } from "../types/enums";
import { initMetrics, printReport } from "./metrics";
import { ValidationStage } from "./stages/ValidationStage";
import { NormalizationStage } from "./stages/NormalizationStage";
import { DeduplicationStage } from "./stages/DeduplicationStage";
import { ProductIdentityShadowStage } from "./stages/ProductIdentityShadowStage";
import { MediaStage } from "./stages/MediaStage";
import { CatalogWriteStage } from "./stages/CatalogWriteStage";
import type { ISyncStage } from "./stages/ISyncStage";
import type { ProductIdentityService } from "@/src/domains/product-identity/services/ProductIdentityService";
import { EventService } from "@/src/domains/trust/services/EventService";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";
import {
  connectorSyncStartedEvent,
  connectorSyncCompletedEvent,
  connectorSyncFailedEvent,
} from "../events/connector.events";

export interface SyncOrchestratorOptions {
  skipMedia?: boolean;
}

export interface SyncRunOptions {
  dryRun?: boolean;
  skipMedia?: boolean;
  /**
   * Only merchant-triggered syncs emit Brain events (TrustDomainEvent.merchantId
   * is a required string) — admin/global connector runs pass no merchantId and
   * skip Brain ingestion in Epic 1. See RELEASE_1_7_EXECUTION_PLAN.md decision #5.
   */
  merchantId?: string | null;
  verbose?: boolean;
}

export interface SyncRunOutcome extends PipelineResult {
  syncRunId: string | null;
}

function toCreateEventInput(event: TrustDomainEvent) {
  return {
    merchant_id: event.merchantId,
    event_type: event.eventType,
    source: event.source,
    metadata: event.metadata,
  };
}

// Replaces acquisition/core/pipeline.ts's AcquisitionPipeline. Same fixed
// stage sequence (Validation → Normalization → Deduplication → [Media] →
// CatalogWrite), plus persistence of Connector/SyncRun rows and Brain events.
export class SyncOrchestrator {
  private readonly defaultSkipMedia: boolean;

  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly storage: SupabaseClient,
    private readonly connectorRepo: IConnectorRepository,
    private readonly syncRunRepo: ISyncRunRepository,
    private readonly eventService: EventService,
    private readonly productIdentityService: ProductIdentityService,
    options: SyncOrchestratorOptions = {}
  ) {
    this.defaultSkipMedia = options.skipMedia ?? false;
  }

  private buildStages(skipMedia: boolean): ISyncStage[] {
    return [
      new ValidationStage(),
      new NormalizationStage(),
      new DeduplicationStage(),
      new ProductIdentityShadowStage(),
      ...(skipMedia ? [] : [new MediaStage()]),
      new CatalogWriteStage(),
    ];
  }

  async run(metadata: ConnectorMetadata, items: RawOffer[], options: SyncRunOptions = {}): Promise<SyncRunOutcome> {
    const { dryRun = false, merchantId = null, verbose = false, skipMedia = this.defaultSkipMedia } = options;
    const stages = this.buildStages(skipMedia);
    const connectorId = metadata.id;
    const batchId = `${connectorId}-${Date.now()}`;

    const connector = await this.connectorRepo.upsertFromMetadata(metadata);

    const syncRun = connector
      ? await this.syncRunRepo.create({
          connectorId: connector.id,
          connectorKey: metadata.id,
          merchantId,
          batchId,
          dryRun,
        })
      : null;

    if (merchantId) {
      await this.eventService.recordEvent(
        toCreateEventInput(connectorSyncStartedEvent(merchantId, metadata.id, batchId, dryRun))
      );
    }

    let ctx: PipelineContext = {
      connectorId,
      batchId,
      dryRun,
      catalogRepo: this.catalogRepo,
      storage: this.storage,
      productIdentityService: this.productIdentityService,
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
      console.log(`\n[sync] Starting ${connectorId} — ${items.length} items | dryRun=${dryRun}`);
    }

    for (const stage of stages) {
      if (verbose) console.log(`[sync] Stage: ${stage.name}`);
      ctx = await stage.execute(ctx);
    }

    ctx.metrics.completedAt = new Date().toISOString();
    ctx.metrics.durationMs = new Date(ctx.metrics.completedAt).getTime() - new Date(ctx.metrics.startedAt).getTime();

    if (verbose) printReport(ctx);

    const success = ctx.errors.length === 0;

    if (syncRun) {
      const status = success
        ? SyncRunStatus.Success
        : ctx.metrics.totals.persisted > 0
          ? SyncRunStatus.Partial
          : SyncRunStatus.Failed;

      await this.syncRunRepo.update(syncRun.id, {
        status,
        totals: ctx.metrics.totals,
        errors: ctx.errors.length > 0 ? ctx.errors : null,
        completedAt: ctx.metrics.completedAt,
      });
    }

    if (merchantId) {
      const event = success
        ? connectorSyncCompletedEvent(merchantId, metadata.id, batchId, ctx.metrics.totals)
        : connectorSyncFailedEvent(merchantId, metadata.id, batchId, ctx.errors.length);
      await this.eventService.recordEvent(toCreateEventInput(event));
    }

    return {
      batchId,
      connectorId,
      dryRun,
      success,
      metrics: ctx.metrics,
      errors: ctx.errors,
      persisted: ctx.persisted,
      syncRunId: syncRun?.id ?? null,
    };
  }
}
