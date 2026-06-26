import type { PipelineContext, StageMetrics, PipelineError } from "../types/pipeline";

export function initMetrics(connectorId: string, batchId: string) {
  return {
    connectorId,
    batchId,
    startedAt: new Date().toISOString(),
    stages: [] as StageMetrics[],
    totals: {
      received: 0,
      validated: 0,
      normalized: 0,
      deduplicated: 0,
      persisted: 0,
      failed: 0,
      skipped: 0,
    },
  };
}

export function recordStage(
  ctx: PipelineContext,
  stage: string,
  startedAt: string,
  accepted: number,
  rejected: number,
  skipped = 0
): void {
  const completedAt = new Date().toISOString();
  const durationMs = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  ctx.metrics.stages.push({ stage, startedAt, completedAt, durationMs, accepted, rejected, skipped });
}

export function recordError(ctx: PipelineContext, stage: string, error: string, item?: unknown): void {
  const entry: PipelineError = { stage, error, timestamp: new Date().toISOString() };
  if (item !== undefined) entry.item = item;
  ctx.errors.push(entry);
}

export function printReport(ctx: PipelineContext): void {
  const m = ctx.metrics;
  const durationMs = m.completedAt
    ? new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime()
    : 0;

  console.log("\n" + "═".repeat(60));
  console.log(`  ACQUISITION REPORT — ${m.connectorId}`);
  console.log("═".repeat(60));
  console.log(`  Batch  : ${m.batchId}`);
  console.log(`  Mode   : ${ctx.dryRun ? "DRY-RUN" : "EXECUTE"}`);
  console.log(`  Duration: ${durationMs}ms`);
  console.log("");
  console.log("  TOTALS");
  console.log(`    Received    : ${m.totals.received}`);
  console.log(`    Validated   : ${m.totals.validated}`);
  console.log(`    Normalized  : ${m.totals.normalized}`);
  console.log(`    Deduplicated: ${m.totals.deduplicated}`);
  console.log(`    Persisted   : ${m.totals.persisted}`);
  console.log(`    Skipped     : ${m.totals.skipped}`);
  console.log(`    Failed      : ${m.totals.failed}`);
  console.log("");
  console.log("  STAGES");
  for (const s of m.stages) {
    console.log(`    [${s.stage.padEnd(20)}] ${s.durationMs}ms  ✓${s.accepted} ✗${s.rejected} ~${s.skipped}`);
  }
  if (ctx.errors.length > 0) {
    console.log("");
    console.log("  ERRORS");
    for (const e of ctx.errors) {
      console.log(`    [${e.stage}] ${e.error}`);
    }
  }
  console.log("═".repeat(60) + "\n");
}
