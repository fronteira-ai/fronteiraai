/**
 * Program Ω — Mission Ω-1 — Pilot execution (authorized by the CTO).
 *
 * Runs the real end-to-end pipeline against production for the 34
 * "alta confiança" (>=95%) pending merge_candidates, all confirmed
 * intra-store (scripts/merge-crossstore-sample.ts) — catalog-duplicate
 * cleanup, zero risk to Comparable Product Coverage. Steps:
 *   1. Approve all 34.
 *   2. Execute the first 5 individually (with a preview/dry-run first),
 *      confirm results.
 *   3. Execute the remaining 29 via executeBatch.
 *   4. Roll back exactly 1 execution to prove reversibility end-to-end.
 *   5. Print a summary.
 *
 * Uso: npx tsx scripts/merge-pilot.ts
 */
import { getServiceClient } from "./lib/client";
import {
  SupabaseCanonicalCatalogRepository,
  SupabaseMergeCandidateRepository,
  SupabaseMergeExecutionRepository,
  MergeAuditService,
  MergeExecutorService,
} from "../src/domains/canonical-catalog";

const EXECUTED_BY = "cto-pilot@paraguai.com";

async function main() {
  const supabase = getServiceClient();
  const catalogRepo = new SupabaseCanonicalCatalogRepository(supabase);
  const candidateRepo = new SupabaseMergeCandidateRepository(supabase);
  const executionRepo = new SupabaseMergeExecutionRepository(supabase);
  const auditService = new MergeAuditService(candidateRepo);
  const executor = new MergeExecutorService(candidateRepo, catalogRepo, executionRepo);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Merge Execution Pilot — Program Ω, Mission Ω-1          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const audit = await auditService.classifyPending();
  const pilotCandidates = audit.alta;
  console.log(`Pilot scope: ${pilotCandidates.length} candidatos de alta confiança (>=95%), todos intra-store.\n`);

  // Step 1 — approve all.
  console.log("— Aprovando —");
  for (const c of pilotCandidates) {
    const result = await executor.approve(c.id, EXECUTED_BY);
    if (!result.ok) console.error(`  FALHA ao aprovar ${c.id}: ${result.error.message}`);
  }
  console.log(`  ${pilotCandidates.length} candidato(s) aprovado(s).\n`);

  // Step 2 — preview + execute the first 5 individually.
  console.log("— Executando os primeiros 5 individualmente (com preview antes) —");
  const first5 = pilotCandidates.slice(0, 5);
  const executedIds: string[] = [];
  for (const c of first5) {
    const preview = await executor.preview(c.id);
    if (!preview.ok) {
      console.error(`  PREVIEW FALHOU ${c.id}: ${preview.error.message}`);
      continue;
    }
    console.log(`  ${c.id.slice(0, 8)}: preview mostra ${preview.preview.offerIdsToMove.length} oferta(s) a mover`);

    const result = await executor.execute(c.id, EXECUTED_BY);
    if (!result.ok) {
      console.error(`  EXECUÇÃO FALHOU ${c.id}: ${result.error.message}`);
      continue;
    }
    console.log(`  ${c.id.slice(0, 8)}: executado — ${result.offersMoved} oferta(s) movida(s), execution=${result.execution.id.slice(0, 8)}`);
    executedIds.push(c.id);
  }

  // Step 3 — batch-execute the remaining.
  const remaining = pilotCandidates.slice(5).map((c) => c.id);
  console.log(`\n— Executando os ${remaining.length} restantes via executeBatch —`);
  const batchResult = await executor.executeBatch(remaining, EXECUTED_BY);
  console.log(`  Tentados: ${batchResult.attempted} | Sucesso: ${batchResult.succeeded.length} | Falha: ${batchResult.failed.length} | Ofertas movidas: ${batchResult.totalOffersMoved}`);
  if (batchResult.failed.length > 0) {
    for (const f of batchResult.failed) console.error(`  FALHA ${f.candidateId}: ${f.error.message}`);
  }

  // Step 4 — roll back exactly 1 execution to prove reversibility.
  console.log("\n— Testando rollback (1 execução) —");
  const firstExecuted = executedIds[0];
  if (firstExecuted) {
    const candidate = await candidateRepo.findById(firstExecuted);
    if (candidate) {
      const execution = await executionRepo.findByCandidateId(firstExecuted);
      if (execution) {
        const rollbackResult = await executor.rollback(execution.id, EXECUTED_BY);
        if (rollbackResult.ok) {
          console.log(`  Rollback OK: execution ${execution.id.slice(0, 8)} revertida — ${execution.movedOfferIds.length} oferta(s) devolvida(s) à origem.`);
        } else {
          console.error(`  ROLLBACK FALHOU: ${rollbackResult.error.message}`);
        }
      }
    }
  }

  console.log("\n[merge-pilot] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
