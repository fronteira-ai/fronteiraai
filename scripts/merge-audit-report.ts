/**
 * Merge Candidate Audit report — PROGRAM Ω, Mission Ω-1, Objetivo 1.
 *
 * Read-only. Classifies every `merge_candidates` row with status='pending'
 * into Alta (>=95%), Média (85-94%) and Revisão manual (70-84%), reusing
 * MergeAuditService — no new algorithm, same confidence tiers the CTO
 * already approved for Product Identity.
 *
 * Uso:
 *   npx tsx scripts/merge-audit-report.ts
 */

import { getServiceClient } from "./lib/client";
import { SupabaseMergeCandidateRepository, MergeAuditService } from "../src/domains/canonical-catalog";

async function main() {
  const supabase = getServiceClient();
  const repo = new SupabaseMergeCandidateRepository(supabase);
  const service = new MergeAuditService(repo);

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Merge Candidate Audit — Program Ω, Mission Ω-1          ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const audit = await service.classifyPending();

  console.log(`Total pending: ${audit.total}`);
  console.log(`  Alta confiança (>=95%):     ${audit.alta.length}`);
  console.log(`  Média confiança (85-94%):   ${audit.media.length}`);
  console.log(`  Revisão manual (70-84%):    ${audit.revisaoManual.length}`);

  if (audit.alta.length > 0) {
    console.log("\n— Alta confiança (amostra até 10) —");
    for (const c of audit.alta.slice(0, 10)) {
      console.log(`  ${c.id} | ${c.confidence}% | ${c.sourceCanonicalProductId} -> ${c.targetCanonicalProductId} | ${c.reason}`);
    }
  }

  console.log("\n[merge-audit-report] done.");
}

main().catch((err) => {
  console.error("[Fatal]", err);
  process.exit(1);
});
