import type { SupabaseClient } from "@supabase/supabase-js";
import type { RawOffer, RawOfferStream } from "../types/raw.types";
import type { PipelineContext, PipelineError, PipelineResult } from "../types/pipeline.types";
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
import { CanonicalLinkStage } from "./stages/CanonicalLinkStage";
import { MarketChangeDetectionStage } from "./stages/MarketChangeDetectionStage";
import type { ISyncStage } from "./stages/ISyncStage";
import type { ProductIdentityService } from "@/src/domains/product-identity/services/ProductIdentityService";
import type { ChangeDetectionService } from "@/src/domains/realtime-commerce/change-detection/ChangeDetectionService";
import type { MarketplaceMemoryService } from "@/src/domains/marketplace-memory";
import type { CanonicalProductService, ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { ICanonicalSuggestionOutboxRepository } from "../repositories/ICanonicalSuggestionOutboxRepository";
import { EventService } from "@/src/domains/trust/services/EventService";
import type { TrustDomainEvent } from "@/src/domains/trust/events/trust.events";
import {
  connectorSyncStartedEvent,
  connectorSyncCompletedEvent,
  connectorSyncFailedEvent,
} from "../events/connector.events";

export interface SyncOrchestratorOptions {
  skipMedia?: boolean;
  /** Mission Ω-Gatekeeper (Catalog Integrity Firewall) — threaded into every
   * PipelineContext so CatalogWriteStage can consult/record learned brand
   * and category corrections (MerchantAttributePattern.resolvedValue).
   * Optional, defaults to null — every existing caller/test is unaffected. */
  marketplaceMemoryService?: MarketplaceMemoryService | null;
  /** Mission Ω-Canonical Integration — threaded into every PipelineContext
   * so CanonicalLinkStage can bootstrap+link canonical products. Optional,
   * defaults to null (stage becomes a no-op) — every existing caller/test
   * is unaffected, same discipline as marketplaceMemoryService above. */
  canonicalProductService?: CanonicalProductService | null;
  canonicalCatalogRepo?: ICanonicalCatalogRepository | null;
  canonicalSuggestionOutboxRepo?: ICanonicalSuggestionOutboxRepository | null;
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
  /** Mission Ω-Pipeline (Scalable Connector Architecture) — items are read
   * and persisted in fixed-size batches so memory stays bounded regardless
   * of catalog size; each batch's raw/validated/normalized/deduplicated
   * arrays go out of scope (eligible for GC) before the next batch is read.
   * Only meaningful for runStream(); run() derives its own value (the whole
   * input array as a single batch) so its behavior stays unchanged. */
  batchSize?: number;
}

export interface SyncRunOutcome extends PipelineResult {
  syncRunId: string | null;
}

export const DEFAULT_SYNC_BATCH_SIZE = 200;

function toCreateEventInput(event: TrustDomainEvent) {
  return {
    merchant_id: event.merchantId,
    event_type: event.eventType,
    source: event.source,
    metadata: event.metadata,
  };
}

async function* arrayToStream(items: RawOffer[]): RawOfferStream {
  yield* items;
}

async function readBatch(
  iterator: AsyncIterator<RawOffer, void, void>,
  size: number
): Promise<{ items: RawOffer[]; done: boolean }> {
  const items: RawOffer[] = [];
  let done = false;
  for (let i = 0; i < size; i++) {
    const next = await iterator.next();
    if (next.done) {
      done = true;
      break;
    }
    items.push(next.value);
  }
  return { items, done };
}

function addTotals(target: PipelineResult["metrics"]["totals"], source: PipelineResult["metrics"]["totals"]): void {
  target.received += source.received;
  target.validated += source.validated;
  target.normalized += source.normalized;
  target.deduplicated += source.deduplicated;
  target.persisted += source.persisted;
  target.failed += source.failed;
  target.skipped += source.skipped;
}

// Replaces acquisition/core/pipeline.ts's AcquisitionPipeline. Same fixed
// stage sequence (Validation → Normalization → Deduplication → [Media] →
// CatalogWrite), plus persistence of Connector/SyncRun rows and Brain events.
export class SyncOrchestrator {
  private readonly defaultSkipMedia: boolean;
  private readonly marketplaceMemoryService: MarketplaceMemoryService | null;
  private readonly canonicalProductService: CanonicalProductService | null;
  private readonly canonicalCatalogRepo: ICanonicalCatalogRepository | null;
  private readonly canonicalSuggestionOutboxRepo: ICanonicalSuggestionOutboxRepository | null;

  constructor(
    private readonly catalogRepo: ICatalogRepository,
    private readonly storage: SupabaseClient,
    private readonly connectorRepo: IConnectorRepository,
    private readonly syncRunRepo: ISyncRunRepository,
    private readonly eventService: EventService,
    private readonly productIdentityService: ProductIdentityService,
    private readonly changeDetectionService: ChangeDetectionService,
    options: SyncOrchestratorOptions = {}
  ) {
    this.defaultSkipMedia = options.skipMedia ?? false;
    this.marketplaceMemoryService = options.marketplaceMemoryService ?? null;
    this.canonicalProductService = options.canonicalProductService ?? null;
    this.canonicalCatalogRepo = options.canonicalCatalogRepo ?? null;
    this.canonicalSuggestionOutboxRepo = options.canonicalSuggestionOutboxRepo ?? null;
  }

  private buildStages(skipMedia: boolean): ISyncStage[] {
    return [
      new ValidationStage(),
      new NormalizationStage(),
      new DeduplicationStage(),
      new ProductIdentityShadowStage(),
      ...(skipMedia ? [] : [new MediaStage()]),
      new CatalogWriteStage(),
      new CanonicalLinkStage(),
      new MarketChangeDetectionStage(),
    ];
  }

  /** Legacy entry point — kept byte-identical in observable behavior for
   * every existing caller (tests, merchant-triggered imports, any
   * not-yet-migrated connector). Internally just runStream() with the
   * whole input array treated as a single batch (batchSize = items.length),
   * so a small array — every current caller — produces exactly the same
   * single-batch stage sequence, totals, and result shape as before this
   * Mission. Real streaming (bounded memory for 50k+ items) only kicks in
   * when a caller uses runStream() directly with a smaller batchSize, which
   * is what ManualSyncTrigger now does for any connector exposing
   * `fetchStream`. */
  async run(metadata: ConnectorMetadata, items: RawOffer[], options: SyncRunOptions = {}): Promise<SyncRunOutcome> {
    return this.runStream(metadata, arrayToStream(items), {
      ...options,
      batchSize: options.batchSize ?? Math.max(items.length, 1),
    });
  }

  /** Mission Ω-Pipeline (Scalable Connector Architecture) — the real
   * implementation. Reads `items` in fixed-size batches (default
   * DEFAULT_SYNC_BATCH_SIZE); each batch gets its own PipelineContext
   * (raw/validated/normalized/deduplicated scoped to just that batch, never
   * the whole catalog) run through the exact same 7-stage sequence run()
   * always used. The batch's context is discarded (eligible for GC) before
   * the next batch is read — this is the only structural change from run():
   * memory now scales with batchSize, never with catalog size. A batch that
   * throws is recorded as a failed batch and skipped, never aborting the
   * whole run; the SyncRun row's totals are updated after every batch (not
   * only at the end), so an interrupted process leaves an accurate
   * partial-progress record and a re-run naturally resumes (Delta Import's
   * checkpoints + idempotent upserts already guarantee nothing already
   * persisted gets duplicated). */
  async runStream(
    metadata: ConnectorMetadata,
    items: RawOfferStream,
    options: SyncRunOptions = {}
  ): Promise<SyncRunOutcome> {
    const {
      dryRun = false,
      merchantId = null,
      verbose = false,
      skipMedia = this.defaultSkipMedia,
      batchSize = DEFAULT_SYNC_BATCH_SIZE,
    } = options;
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

    const metrics = initMetrics(connectorId, batchId);
    const errors: PipelineError[] = [];
    const persisted: PipelineResult["persisted"] = [];

    if (verbose) {
      console.log(`\n[sync] Starting ${connectorId} | dryRun=${dryRun} | batchSize=${batchSize}`);
    }

    let batchNumber = 0;
    for (;;) {
      const { items: batch, done } = await readBatch(items, batchSize);

      if (batch.length > 0) {
        batchNumber++;
        if (verbose) console.log(`[sync] Batch ${batchNumber} — ${batch.length} item(s)`);

        let ctx: PipelineContext = {
          connectorId,
          batchId,
          dryRun,
          catalogRepo: this.catalogRepo,
          storage: this.storage,
          productIdentityService: this.productIdentityService,
          changeDetectionService: this.changeDetectionService,
          marketplaceMemoryService: this.marketplaceMemoryService,
          canonicalProductService: this.canonicalProductService,
          canonicalCatalogRepo: this.canonicalCatalogRepo,
          canonicalSuggestionOutboxRepo: this.canonicalSuggestionOutboxRepo,
          raw: batch,
          validated: [],
          normalized: [],
          deduplicated: [],
          persisted: [],
          metrics: initMetrics(connectorId, batchId),
          errors: [],
        };
        ctx.metrics.totals.received = batch.length;

        try {
          for (const stage of stages) {
            if (verbose) console.log(`[sync]   Stage: ${stage.name}`);
            ctx = await stage.execute(ctx);
          }
        } catch (err) {
          errors.push({ stage: "batch", error: String(err), timestamp: new Date().toISOString() });
          console.error(`[sync] Batch ${batchNumber} failed entirely, skipping: ${String(err)}`);
        }

        metrics.stages.push(...ctx.metrics.stages);
        addTotals(metrics.totals, ctx.metrics.totals);
        errors.push(...ctx.errors);
        persisted.push(...ctx.persisted);

        if (syncRun) {
          await this.syncRunRepo.update(syncRun.id, { status: SyncRunStatus.Running, totals: metrics.totals });
        }

        if (verbose) {
          const heapMB = Math.round(process.memoryUsage().heapUsed / (1024 * 1024));
          console.log(
            `[sync] Batch ${batchNumber} done — cumulative persisted=${metrics.totals.persisted}, failed=${metrics.totals.failed}, heapUsed=${heapMB}MB`
          );
        }
        // `ctx` and `batch` fall out of scope here — nothing from this
        // batch is referenced past this point, so the next loop iteration
        // starts with the previous batch's raw/validated/normalized/
        // deduplicated objects already eligible for GC.
      }

      if (done) break;
    }

    metrics.completedAt = new Date().toISOString();
    metrics.durationMs = new Date(metrics.completedAt).getTime() - new Date(metrics.startedAt).getTime();

    if (verbose) printReport({ dryRun, metrics, errors });

    const success = errors.length === 0;

    if (syncRun) {
      const status = success
        ? SyncRunStatus.Success
        : metrics.totals.persisted > 0
          ? SyncRunStatus.Partial
          : SyncRunStatus.Failed;

      await this.syncRunRepo.update(syncRun.id, {
        status,
        totals: metrics.totals,
        errors: errors.length > 0 ? errors : null,
        completedAt: metrics.completedAt,
      });
    }

    if (merchantId) {
      const event = success
        ? connectorSyncCompletedEvent(merchantId, metadata.id, batchId, metrics.totals)
        : connectorSyncFailedEvent(merchantId, metadata.id, batchId, errors.length);
      await this.eventService.recordEvent(toCreateEventInput(event));
    }

    return {
      batchId,
      connectorId,
      dryRun,
      success,
      metrics,
      errors,
      persisted,
      syncRunId: syncRun?.id ?? null,
    };
  }
}
