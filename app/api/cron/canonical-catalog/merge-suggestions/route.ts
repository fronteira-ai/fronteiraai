import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { CanonicalSuggestionSweepService, SupabaseCanonicalSuggestionOutboxRepository, OutboxObservabilityService } from "@/src/domains/connectors";

// Mission Ω-Canonical Integration. The only caller of
// CanonicalMergeSuggestionService.suggestMergesFor() left in the system —
// deliberately decoupled from the Sync Pipeline's request budget (Fase 1
// decision: suggestMergesFor()'s cost is proportional to same-brand
// candidate-pool size, which only grows with the catalog; keeping it out
// of the 60s Sync Pipeline critical path was the whole point of the
// canonical_suggestion_outbox).
//
// Triggered by vercel.json's cron entry, same shared-secret auth as every
// other cron route in this project. Drains canonical_suggestion_outbox in
// batches, looping within this route's own maxDuration — never the Sync
// Pipeline's — until the queue is caught up or the iteration cap is hit
// (whichever first; a full historical backlog is
// HistoricalCanonicalBootstrapService's job, not this cron's).
//
// Mission Ω-Hardening: batch size is no longer fixed — sweep() is called
// with no explicit limit, so it computes one adaptively from current
// backlog + recent throughput (bounded by OUTBOX_MIN_BATCH_SIZE/
// OUTBOX_MAX_BATCH_SIZE). The loop's stop condition changed from
// "claimed < FIXED_LIMIT" to "claimed === 0" accordingly — still exactly
// "stop when there's nothing left to do right now", just correct for a
// variable limit.
export const maxDuration = 60;

const STALE_CLAIM_MS = 5 * 60_000;
const MAX_ITERATIONS = 20; // caps worst-case work per invocation

// Hotfix (2026-07-29): production evidence (Vercel runtime logs) showed
// this route hitting "Task timed out after 60 seconds" (504) on every
// real invocation once the outbox held a real backlog (~7.7k items) —
// neither MAX_ITERATIONS nor claimed===0 ever kicked in, because the
// route never survived past the first sweep() call. Root cause: nothing
// in this route or in sweep()'s per-item loop ever checked elapsed time
// against maxDuration — a batch could (and did) contain items whose
// suggestMergesFor() cost is proportional to same-brand candidate-pool
// size (up to ~3k products for the largest brand), so a "full" 200-item
// batch had no upper bound on wall-clock cost.
//
// ROUTE_TIME_BUDGET_MS stops the outer loop from starting another sweep()
// and stops sweep()'s own item loop from starting another item once
// elapsed time crosses this budget — leaving margin under maxDuration for
// whatever single item was already in flight plus the final observability
// snapshot below. Unprocessed claimed items stay `processing` and are
// picked up by the next invocation via the same staleClaimMs recovery
// path already used for a crashed worker — no new recovery mechanism, no
// change to the outbox's AT LEAST ONCE DELIVERY contract.
const ROUTE_TIME_BUDGET_MS = 45_000;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { mergeSuggestionService } = createCanonicalCatalogServices(client);
  const outboxRepo = new SupabaseCanonicalSuggestionOutboxRepository(client);
  const sweepService = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);
  const observabilityService = new OutboxObservabilityService(outboxRepo);

  const startedAt = Date.now();
  const deadlineAt = startedAt + ROUTE_TIME_BUDGET_MS;
  let totalClaimed = 0;
  let totalSucceeded = 0;
  let totalRetried = 0;
  let totalDeadLettered = 0;
  let iterations = 0;
  let stoppedForDeadline = false;

  for (; iterations < MAX_ITERATIONS && Date.now() < deadlineAt; iterations++) {
    const result = await sweepService.sweep(undefined, STALE_CLAIM_MS, deadlineAt);
    totalClaimed += result.claimed;
    totalSucceeded += result.succeeded;
    totalRetried += result.retried;
    totalDeadLettered += result.deadLettered;
    if (result.stoppedForDeadline) stoppedForDeadline = true;
    if (result.claimed === 0) break; // caught up — nothing more due right now
  }

  const durationMs = Date.now() - startedAt;
  const metrics = await observabilityService.snapshot();

  console.log(
    JSON.stringify({
      event: "canonical_suggestion_sweep",
      queue_size: metrics.queueSizeTotal,
      batch_size: totalClaimed > 0 ? Math.round(totalClaimed / Math.max(iterations, 1)) : 0,
      claimed: totalClaimed,
      processed: totalSucceeded + totalRetried + totalDeadLettered,
      retry: totalRetried,
      dead_letter: totalDeadLettered,
      expired: metrics.expired,
      processing_time_ms: durationMs,
      backlog_remaining: metrics.backlogRemaining,
      estimated_completion_minutes: metrics.estimatedCompletionMinutes,
      stopped_for_deadline: stoppedForDeadline,
    })
  );

  return NextResponse.json({
    data: {
      iterations,
      totalClaimed,
      totalSucceeded,
      totalRetried,
      totalDeadLettered,
      durationMs,
      stoppedForDeadline,
      metrics,
    },
  });
}
