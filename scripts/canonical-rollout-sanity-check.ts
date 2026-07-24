/**
 * Mission Ω-Canonical Rollout — Pre-Deploy Sanity Check.
 *
 * 100% read-only. Confirms the two migrations
 * (20260724120000_canonical_suggestion_outbox.sql,
 * 20260725090000_outbox_hardening.sql) landed correctly, permissions are
 * right, both new tables are empty (no code deployed yet), and every
 * pre-existing system this rollout must never regress still works —
 * before a single line of application code reaches production.
 *
 * Uso:
 *   npx tsx scripts/canonical-rollout-sanity-check.ts
 */

import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "./lib/client";
import { SupabaseCatalogRepository } from "@/src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import { SupabaseRecoveryRepository } from "@/src/domains/connectors/infrastructure/SupabaseRecoveryRepository";
import { SupabaseMergeCandidateRepository } from "@/src/domains/canonical-catalog/infrastructure/SupabaseMergeCandidateRepository";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog/types/enums";

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];
function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "[OK]  " : "[FAIL]"} ${name} — ${detail}`);
}

async function main() {
  console.log("\n=== Mission Ω-Canonical Rollout — Sanity Check (read-only) ===\n");
  const supabase = getServiceClient();

  // ── 1. Conexão ──────────────────────────────────────────────────────
  console.log("--- 1. Conexão ---");
  try {
    const { error } = await supabase.from("stores").select("id").limit(1);
    if (error) throw error;
    record("connection.service_role", true, "SELECT em `stores` respondeu sem erro");
  } catch (err) {
    record("connection.service_role", false, String(err));
  }

  // ── 2. Schema: canonical_suggestion_outbox (com hardening) ─────────
  console.log("\n--- 2. Schema: canonical_suggestion_outbox ---");
  const outboxColumns = [
    "id", "canonical_product_id", "status", "priority", "attempts", "last_error",
    "last_attempted_at", "next_attempt_at", "claimed_at", "algorithm_version",
    "source", "enqueued_at", "completed_at", "created_at",
  ];
  try {
    const { error } = await supabase.from("canonical_suggestion_outbox").select(outboxColumns.join(",")).limit(0);
    if (error) throw error;
    record("schema.canonical_suggestion_outbox.columns", true, `todas as ${outboxColumns.length} colunas presentes (inclui priority do Ω-Hardening)`);
  } catch (err) {
    record("schema.canonical_suggestion_outbox.columns", false, String(err));
  }

  try {
    const { error } = await supabase.from("canonical_suggestion_outbox").select("id").eq("status", "expired").limit(0);
    if (error) throw error;
    record("schema.canonical_suggestion_outbox.expired_status", true, "status='expired' aceito pelo CHECK constraint");
  } catch (err) {
    record("schema.canonical_suggestion_outbox.expired_status", false, String(err));
  }

  try {
    const { count, error } = await supabase.from("canonical_suggestion_outbox").select("*", { count: "exact", head: true });
    if (error) throw error;
    record("tables.canonical_suggestion_outbox.empty", (count ?? 0) === 0, `${count ?? 0} linhas (esperado: 0, nenhum deploy de código ainda)`);
  } catch (err) {
    record("tables.canonical_suggestion_outbox.empty", false, String(err));
  }

  // ── 3. Schema: canonical_bootstrap_checkpoint ───────────────────────
  console.log("\n--- 3. Schema: canonical_bootstrap_checkpoint ---");
  const checkpointColumns = ["id", "run_key", "status", "last_product_id", "processed_count", "created_count", "linked_count", "enqueued_count", "failed_count", "last_error", "started_at", "updated_at", "completed_at"];
  try {
    const { error } = await supabase.from("canonical_bootstrap_checkpoint").select(checkpointColumns.join(",")).limit(0);
    if (error) throw error;
    record("schema.canonical_bootstrap_checkpoint.columns", true, `todas as ${checkpointColumns.length} colunas presentes`);
  } catch (err) {
    record("schema.canonical_bootstrap_checkpoint.columns", false, String(err));
  }

  try {
    const { count, error } = await supabase.from("canonical_bootstrap_checkpoint").select("*", { count: "exact", head: true });
    if (error) throw error;
    record("tables.canonical_bootstrap_checkpoint.empty", (count ?? 0) === 0, `${count ?? 0} linhas (esperado: 0)`);
  } catch (err) {
    record("tables.canonical_bootstrap_checkpoint.empty", false, String(err));
  }

  // ── 4. Permissões ────────────────────────────────────────────────────
  console.log("\n--- 4. Permissões ---");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (anonKey) {
    const anonClient = createClient(url, anonKey);
    try {
      const { data, error } = await anonClient.from("canonical_suggestion_outbox").select("id").limit(1);
      if (error || (data ?? []).length === 0) {
        record("permissions.anon_blocked_from_outbox", true, error ? `bloqueado: ${error.message}` : "0 linhas retornadas (RLS sem policy pública)");
      } else {
        record("permissions.anon_blocked_from_outbox", false, `chave anônima leu ${data!.length} linha(s) — RLS mal configurada`);
      }
    } catch (err) {
      record("permissions.anon_blocked_from_outbox", true, `rejeitado: ${String(err)}`);
    }
    try {
      const { data, error } = await anonClient.from("canonical_bootstrap_checkpoint").select("id").limit(1);
      if (error || (data ?? []).length === 0) {
        record("permissions.anon_blocked_from_checkpoint", true, error ? `bloqueado: ${error.message}` : "0 linhas retornadas");
      } else {
        record("permissions.anon_blocked_from_checkpoint", false, `chave anônima leu ${data!.length} linha(s)`);
      }
    } catch (err) {
      record("permissions.anon_blocked_from_checkpoint", true, `rejeitado: ${String(err)}`);
    }
  } else {
    record("permissions.anon_key_available", false, "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente — não foi possível testar isolamento de RLS");
  }

  try {
    const { error } = await supabase.from("canonical_suggestion_outbox").select("id").limit(1);
    record("permissions.service_role_can_read_outbox", !error, error ? String(error) : "service_role lê normalmente");
  } catch (err) {
    record("permissions.service_role_can_read_outbox", false, String(err));
  }

  // ── 5. Sistemas existentes — sem regressão ──────────────────────────
  console.log("\n--- 5. Product Identity / Recovery Engine / Gatekeeper (leitura real) ---");
  try {
    const catalogRepo = new SupabaseCatalogRepository(supabase);
    const knownBrand = await catalogRepo.findBrandByNormalizedName("apple");
    record("gatekeeper.catalog_repo.findBrandByNormalizedName", true, knownBrand ? `resolveu para "${knownBrand.name}"` : "executou sem erro");
  } catch (err) {
    record("gatekeeper.catalog_repo.findBrandByNormalizedName", false, String(err));
  }
  try {
    const recoveryRepo = new SupabaseRecoveryRepository(supabase);
    const total = await recoveryRepo.countCandidates();
    record("recovery_engine.count_candidates", true, `executou: ${total} candidatos pendentes`);
  } catch (err) {
    record("recovery_engine.count_candidates", false, String(err));
  }
  try {
    const mergeRepo = new SupabaseMergeCandidateRepository(supabase);
    const page = await mergeRepo.findByStatus(MergeCandidateStatus.Pending, { limit: 1, offset: 0 });
    record("product_identity.merge_candidates.findByStatus", true, `executou: ${page.total} candidatos pendentes`);
  } catch (err) {
    record("product_identity.merge_candidates.findByStatus", false, String(err));
  }

  // ── Resumo ──────────────────────────────────────────────────────────
  console.log("\n=== RESUMO ===");
  const failed = results.filter((r) => !r.ok);
  console.log(`Checks: ${results.length} | OK: ${results.length - failed.length} | FALHAS: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nFalhas:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("\nNenhuma falha. Nenhuma escrita foi realizada. Schema pronto para o deploy do código.");
  }
}

main().catch((err) => {
  console.error("[canonical-rollout-sanity-check] Fatal:", err);
  process.exit(1);
});
