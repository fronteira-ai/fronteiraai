/**
 * Historical Canonical Bootstrap — Mission Ω-Hardening.
 *
 * Checkpointed, resumable, safely-cancellable successor to
 * canonical-catalog-bootstrap.ts for processing hundreds of thousands of
 * historical products (e.g. Shopping China's un-bootstrapped backlog,
 * measured at 20,477 offers by the Mission Ω-COMPARISON AUDIT) without
 * loading the whole catalog into memory and without losing progress on a
 * process restart.
 *
 * Always writes (bootstrapFromProduct/linkOffer/enqueue are all
 * idempotent — the checkpoint, not a dry-run flag, is this tool's safety
 * mechanism: interrupting and re-running the same --run-key never
 * duplicates work).
 *
 * Uso:
 *   npx tsx scripts/historical-canonical-bootstrap-run.ts --run-key=shopping-china-backlog
 *   npx tsx scripts/historical-canonical-bootstrap-run.ts --run-key=shopping-china-backlog --batch-size=200 --sleep-ms=100 --max-batches=50
 *   npx tsx scripts/historical-canonical-bootstrap-run.ts --run-key=shopping-china-backlog --cancel
 */

import { getServiceClient } from "./lib/client";
import { createCanonicalCatalogServices } from "../lib/canonical-catalog-factory";
import {
  SupabaseCatalogRepository,
  SupabaseCanonicalSuggestionOutboxRepository,
  SupabaseBootstrapCheckpointRepository,
  HistoricalCanonicalBootstrapService,
} from "../src/domains/connectors";

function argValue(flag: string): string | undefined {
  const arg = process.argv.find((a) => a.startsWith(`--${flag}=`));
  return arg ? arg.split("=")[1] : undefined;
}

async function main() {
  const runKey = argValue("run-key");
  if (!runKey) {
    console.error("Uso: --run-key=<nome> é obrigatório (ex.: --run-key=shopping-china-backlog)");
    process.exit(1);
  }

  const supabase = getServiceClient();
  const { canonicalProductService, catalogRepo: canonicalCatalogRepo } = createCanonicalCatalogServices(supabase);
  const catalogRepo = new SupabaseCatalogRepository(supabase);
  const canonicalSuggestionOutboxRepo = new SupabaseCanonicalSuggestionOutboxRepository(supabase);
  const checkpointRepo = new SupabaseBootstrapCheckpointRepository(supabase);

  const service = new HistoricalCanonicalBootstrapService({
    catalogRepo,
    canonicalProductService,
    canonicalCatalogRepo,
    canonicalSuggestionOutboxRepo,
    checkpointRepo,
  });

  if (process.argv.includes("--cancel")) {
    const cancelled = await service.requestCancel(runKey);
    console.log(cancelled ? `[historical-bootstrap] cancelamento solicitado para "${runKey}"` : `[historical-bootstrap] "${runKey}" não está em execução — nada a cancelar`);
    return;
  }

  const batchSize = argValue("batch-size") ? parseInt(argValue("batch-size")!, 10) : undefined;
  const sleepMs = argValue("sleep-ms") ? parseInt(argValue("sleep-ms")!, 10) : undefined;
  const maxBatches = argValue("max-batches") ? parseInt(argValue("max-batches")!, 10) : undefined;

  console.log(`\n[historical-bootstrap] run-key="${runKey}" batchSize=${batchSize ?? "default"} sleepMs=${sleepMs ?? "default"} maxBatches=${maxBatches ?? "unbounded"}\n`);

  const result = await service.run({ runKey, batchSize, sleepMsBetweenBatches: sleepMs, maxBatches });

  console.log("\n[historical-bootstrap] Resultado desta chamada:");
  console.log(`  status: ${result.status}`);
  console.log(`  batches processados nesta chamada: ${result.batchesProcessedThisRun}`);
  console.log(`  itens processados nesta chamada: ${result.itemsProcessedThisRun}`);
  console.log(`  totais acumulados (todas as chamadas): processed=${result.totalProcessed} created=${result.totalCreated} linked=${result.totalLinked} enqueued=${result.totalEnqueued} failed=${result.totalFailed}`);
  console.log(`  lastProductId (checkpoint): ${result.lastProductId}`);
  console.log(`  duração desta chamada: ${result.durationMs}ms`);
  if (result.status === "running") {
    console.log(`\n  Ainda não concluído — reexecute o mesmo comando (mesmo --run-key) para continuar de onde parou.`);
  }
}

main().catch((err) => {
  console.error("[historical-canonical-bootstrap-run] Fatal:", err);
  process.exit(1);
});
