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

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { mergeSuggestionService } = createCanonicalCatalogServices(client);
  const outboxRepo = new SupabaseCanonicalSuggestionOutboxRepository(client);
  const sweepService = new CanonicalSuggestionSweepService(outboxRepo, mergeSuggestionService);
  const observabilityService = new OutboxObservabilityService(outboxRepo);

  const startedAt = Date.now();
  let totalClaimed = 0;
  let totalSucceeded = 0;
  let totalRetried = 0;
  let totalDeadLettered = 0;
  let iterations = 0;

  for (; iterations < MAX_ITERATIONS; iterations++) {
    const result = await sweepService.sweep(undefined, STALE_CLAIM_MS);
    totalClaimed += result.claimed;
    totalSucceeded += result.succeeded;
    totalRetried += result.retried;
    totalDeadLettered += result.deadLettered;
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
      metrics,
    },
  });
}
