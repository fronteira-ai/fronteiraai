import type { CanonicalProductService, ICanonicalCatalogRepository } from "@/src/domains/canonical-catalog";
import type { ICatalogRepository } from "../repositories/ICatalogRepository";
import type { ICanonicalSuggestionOutboxRepository } from "../repositories/ICanonicalSuggestionOutboxRepository";
import type { IBootstrapCheckpointRepository } from "../repositories/IBootstrapCheckpointRepository";
import type { BootstrapCheckpoint, BootstrapCheckpointStatus } from "../domain/BootstrapCheckpoint";

export interface HistoricalBootstrapDependencies {
  catalogRepo: ICatalogRepository;
  canonicalProductService: CanonicalProductService;
  canonicalCatalogRepo: ICanonicalCatalogRepository;
  canonicalSuggestionOutboxRepo: ICanonicalSuggestionOutboxRepository;
  checkpointRepo: IBootstrapCheckpointRepository;
}

export interface HistoricalBootstrapOptions {
  runKey: string;
  batchSize?: number;
  sleepMsBetweenBatches?: number;
  /** Caps how many batches this ONE call to run() processes — a serverless
   * invocation's own time-budget guard. Omit for an unbounded run (e.g. a
   * long-lived script/worker process); the checkpoint makes any number of
   * successive bounded calls equivalent to one unbounded call. */
  maxBatches?: number;
}

export interface BootstrapRunResult {
  runKey: string;
  status: BootstrapCheckpointStatus;
  batchesProcessedThisRun: number;
  itemsProcessedThisRun: number;
  totalProcessed: number;
  totalCreated: number;
  totalLinked: number;
  totalEnqueued: number;
  totalFailed: number;
  lastProductId: string | null;
  durationMs: number;
}

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_SLEEP_MS = 200;
const ENQUEUE_SOURCE_PREFIX = "historical-bootstrap";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toResult(checkpoint: BootstrapCheckpoint, batchesProcessedThisRun: number, itemsProcessedThisRun: number, durationMs: number): BootstrapRunResult {
  return {
    runKey: checkpoint.runKey,
    status: checkpoint.status,
    batchesProcessedThisRun,
    itemsProcessedThisRun,
    totalProcessed: checkpoint.processedCount,
    totalCreated: checkpoint.createdCount,
    totalLinked: checkpoint.linkedCount,
    totalEnqueued: checkpoint.enqueuedCount,
    totalFailed: checkpoint.failedCount,
    lastProductId: checkpoint.lastProductId,
    durationMs,
  };
}

// Mission Ω-Hardening. Processes the historical backlog (e.g. the 20,477
// un-bootstrapped Shopping China offers the Mission Ω-COMPARISON AUDIT
// measured) as a real, checkpointed, resumable, safely-cancellable
// service — not the one-shot, memory-unbounded, non-resumable
// canonical-catalog-bootstrap.ts script this Mission's Fase 2 explicitly
// left in place as "ferramenta excepcional de recuperação histórica".
// This is that tool's proper successor for hundreds of thousands of rows.
//
// Deliberately duplicates (not extracts) the bootstrap+link+enqueue
// sequence CanonicalLinkStage also performs — a real, small, documented
// tradeoff: extracting it into a shared helper would require modifying
// CanonicalLinkStage.ts, forbidden by this Mission's explicit restriction
// ("CanonicalLinkStage NÃO deve sofrer mudanças funcionais"). Both call
// the same three idempotent public methods
// (CanonicalProductService.bootstrapFromProduct, ICanonicalCatalogRepository.linkOffer,
// ICanonicalSuggestionOutboxRepository.enqueue), so behavior stays
// identical without any shared code.
export class HistoricalCanonicalBootstrapService {
  constructor(private readonly deps: HistoricalBootstrapDependencies) {}

  async run(options: HistoricalBootstrapOptions): Promise<BootstrapRunResult> {
    const startedAt = Date.now();
    const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
    const sleepMs = options.sleepMsBetweenBatches ?? DEFAULT_SLEEP_MS;
    const maxBatches = options.maxBatches ?? Infinity;

    let checkpoint = await this.deps.checkpointRepo.findOrCreate(options.runKey);

    if (checkpoint.status === "completed" || checkpoint.status === "cancelled") {
      return toResult(checkpoint, 0, 0, Date.now() - startedAt);
    }
    if (checkpoint.status !== "running") {
      await this.deps.checkpointRepo.markStatus(checkpoint.id, "running");
      checkpoint = { ...checkpoint, status: "running" };
    }

    let processedTotal = checkpoint.processedCount;
    let createdTotal = checkpoint.createdCount;
    let linkedTotal = checkpoint.linkedCount;
    let enqueuedTotal = checkpoint.enqueuedCount;
    let failedTotal = checkpoint.failedCount;
    let lastProductId = checkpoint.lastProductId;
    let batchesProcessedThisRun = 0;
    let itemsProcessedThisRun = 0;

    try {
      while (batchesProcessedThisRun < maxBatches) {
        // Checked before starting each new batch — never mid-item. This is
        // what makes cancellation safe: the worst case is finishing one
        // more already-in-flight batch, never a half-written item.
        const latest = await this.deps.checkpointRepo.findByRunKey(options.runKey);
        if (latest?.status === "cancel_requested") {
          await this.deps.checkpointRepo.markStatus(checkpoint.id, "cancelled");
          checkpoint = { ...checkpoint, status: "cancelled" };
          break;
        }

        const products = await this.deps.catalogRepo.findProductsAfterId(lastProductId, batchSize);
        if (products.length === 0) {
          await this.deps.checkpointRepo.markStatus(checkpoint.id, "completed");
          checkpoint = { ...checkpoint, status: "completed" };
          break;
        }

        for (const product of products) {
          processedTotal++;
          itemsProcessedThisRun++;
          try {
            const canonical = await this.deps.canonicalProductService.bootstrapFromProduct({
              slug: product.slug,
              name: product.name,
              brandId: product.brandId,
              categoryId: product.categoryId,
              imageUrl: product.imageUrl,
              specifications: product.specifications,
            });
            if (canonical.createdAt === canonical.updatedAt) createdTotal++;

            const offerIds = await this.deps.catalogRepo.findOfferIdsByProductId(product.id);
            for (const offerId of offerIds) {
              await this.deps.canonicalCatalogRepo.linkOffer(offerId, canonical.id);
              linkedTotal++;
            }

            await this.deps.canonicalSuggestionOutboxRepo.enqueue(canonical.id, `${ENQUEUE_SOURCE_PREFIX}:${options.runKey}`);
            enqueuedTotal++;
          } catch {
            // Isolated per item — same discipline as CanonicalLinkStage:
            // one product's failure never aborts the batch or the run.
            // lastProductId still advances past it below, so a persistent
            // per-item failure is never retried forever by this service
            // (it is not itself idempotent-with-retry the way the outbox
            // is — a failed historical item is simply skipped and counted;
            // the outbox's own retry/dead-letter machinery is what governs
            // retries for anything that DID get enqueued successfully).
            failedTotal++;
          }
          lastProductId = product.id;
        }

        batchesProcessedThisRun++;
        await this.deps.checkpointRepo.updateProgress(checkpoint.id, {
          lastProductId,
          processedCount: processedTotal,
          createdCount: createdTotal,
          linkedCount: linkedTotal,
          enqueuedCount: enqueuedTotal,
          failedCount: failedTotal,
        });

        if (sleepMs > 0 && batchesProcessedThisRun < maxBatches) {
          await sleep(sleepMs);
        }
      }
    } catch (err) {
      await this.deps.checkpointRepo.markStatus(checkpoint.id, "failed", String(err));
      checkpoint = { ...checkpoint, status: "failed" };
    }

    const finalCheckpoint = (await this.deps.checkpointRepo.findByRunKey(options.runKey)) ?? checkpoint;
    return toResult(finalCheckpoint, batchesProcessedThisRun, itemsProcessedThisRun, Date.now() - startedAt);
  }

  /** Operator-facing — see IBootstrapCheckpointRepository.requestCancel's
   * doc comment. Returns false if the run isn't currently
   * running/paused (nothing to cancel). */
  requestCancel(runKey: string): Promise<boolean> {
    return this.deps.checkpointRepo.requestCancel(runKey);
  }
}
