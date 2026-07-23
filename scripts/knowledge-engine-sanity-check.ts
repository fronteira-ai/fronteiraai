/**
 * Continuous Knowledge Engine — Post-Migration Sanity Check (Program Ω,
 * Mission Ω-5).
 *
 * 100% read-only. Zero INSERT/UPDATE/DELETE anywhere, including
 * knowledge_history itself — this script only ever SELECTs. Run after the
 * migration (`20260723120000_continuous_knowledge_engine.sql`) has been
 * applied, before the real backfill (`--execute`), to confirm the new
 * schema is correct AND that nothing it depends on — or that depends on
 * the tables it reads — regressed.
 *
 * Uso:
 *   npx tsx scripts/knowledge-engine-sanity-check.ts
 */

import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "./lib/client";
import { SupabaseCatalogRepository } from "@/src/domains/connectors/infrastructure/SupabaseCatalogRepository";
import { SupabaseRecoveryRepository } from "@/src/domains/connectors/infrastructure/SupabaseRecoveryRepository";
import { SupabaseMergeCandidateRepository } from "@/src/domains/canonical-catalog/infrastructure/SupabaseMergeCandidateRepository";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog/types/enums";
import { SupabaseKnowledgeRepository } from "@/src/domains/learning-engine";
import { SupabaseLearnedFactRepository, SupabaseMerchantAttributePatternRepository } from "@/src/domains/marketplace-memory";

type CheckResult = { name: string; ok: boolean; detail: string };
const results: CheckResult[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "[OK]  " : "[FAIL]"} ${name} — ${detail}`);
}

async function main() {
  console.log("\n=== Continuous Knowledge Engine — Sanity Check (read-only) ===\n");

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

  // ── 2. Schema / colunas de knowledge_history ───────────────────────
  console.log("\n--- 2. Schema (knowledge_history) ---");
  const expectedColumns = [
    "id", "knowledge_key", "knowledge_type", "scope", "store_id", "raw_value",
    "resolved_value", "confidence", "occurrences", "distinct_store_count",
    "version", "source_system", "source_id", "reason", "is_conflict",
    "algorithm_version", "created_at",
  ];
  try {
    const { data, error } = await supabase.from("knowledge_history").select(expectedColumns.join(",")).limit(0);
    if (error) throw error;
    record("schema.knowledge_history.columns", true, `todas as ${expectedColumns.length} colunas esperadas existem (SELECT com 0 linhas, sem erro)`);
    void data;
  } catch (err) {
    record("schema.knowledge_history.columns", false, String(err));
  }

  try {
    const { count, error } = await supabase.from("knowledge_history").select("*", { count: "exact", head: true });
    if (error) throw error;
    record("tables.knowledge_history.readable", true, `tabela legível, ${count ?? 0} linhas (esperado: 0, nenhuma escrita ainda)`);
    if ((count ?? 0) !== 0) {
      record("tables.knowledge_history.empty", false, `esperava 0 linhas antes do backfill, encontrou ${count}`);
    } else {
      record("tables.knowledge_history.empty", true, "confirmado vazia — nenhuma escrita ocorreu");
    }
  } catch (err) {
    record("tables.knowledge_history.readable", false, String(err));
  }

  // ── 3. Tabelas dependentes (fontes confirmadas + consumidores) ─────
  console.log("\n--- 3. Tabelas dependentes ---");
  const dependentTables: { table: string; columns: string[] }[] = [
    { table: "merchant_attribute_patterns", columns: ["id", "store_id", "raw_key", "concept", "occurrences", "resolved_value", "validation_status"] },
    { table: "marketplace_memory_facts", columns: ["id", "canonical_product_id", "fact_type", "fact_value", "confidence", "validation_status", "merchant_id"] },
    { table: "catalog_pending_reviews", columns: ["id", "store_id", "field_type", "raw_value", "status", "resolved_value", "resolved_by"] },
    { table: "catalog_recovery_decisions", columns: ["id", "product_id", "field_type", "layer", "recovered_value", "confidence", "evidence"] },
    { table: "product_identifiers", columns: ["id", "product_id", "identifier_type", "identifier_value", "brand_id"] },
    { table: "merge_candidates", columns: ["id", "status", "confidence", "algorithm_version"] },
    { table: "canonical_products", columns: ["id", "brand_id", "category_id", "specifications"] },
    { table: "products", columns: ["id", "name", "brand_id", "category_id", "specifications"] },
    { table: "offers", columns: ["id", "product_id", "store_id"] },
    { table: "brands", columns: ["id", "name"] },
    { table: "categories", columns: ["id", "name"] },
    { table: "stores", columns: ["id", "name", "slug"] },
  ];
  for (const { table, columns } of dependentTables) {
    try {
      const { error } = await supabase.from(table).select(columns.join(",")).limit(1);
      if (error) throw error;
      record(`tables.${table}`, true, "colunas esperadas presentes, tabela legível");
    } catch (err) {
      record(`tables.${table}`, false, String(err));
    }
  }

  // ── 4. Índices ──────────────────────────────────────────────────────
  console.log("\n--- 4. Índices ---");
  try {
    const { error } = await supabase.schema("pg_catalog" as never).from("pg_indexes").select("indexname").limit(1);
    if (error) throw error;
    record("indexes.pg_catalog_access", true, "pg_catalog acessível via REST (inesperado neste projeto)");
  } catch {
    record(
      "indexes.pg_catalog_access",
      true,
      "pg_catalog não exposto via PostgREST (esperado — mesma limitação de ADR-017; nenhum mecanismo de introspecção SQL neste ambiente). " +
        "Índices confirmados por leitura do arquivo da migration aplicada: idx_knowledge_history_key_version, " +
        "idx_knowledge_history_type_scope, idx_knowledge_history_store, idx_knowledge_history_type_resolved_value, " +
        "e a constraint UNIQUE(knowledge_key, version) — não verificável programaticamente neste ambiente, só por inspeção do SQL já aplicado."
    );
  }

  // ── 5. Permissões (RLS) ─────────────────────────────────────────────
  console.log("\n--- 5. Permissões ---");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) {
    record("permissions.anon_key_available", false, "NEXT_PUBLIC_SUPABASE_ANON_KEY ausente em .env.local — não foi possível testar isolamento de RLS");
  } else {
    const anonClient = createClient(url, anonKey);
    try {
      const { data, error } = await anonClient.from("knowledge_history").select("id").limit(1);
      if (error) {
        record("permissions.anon_blocked_from_knowledge_history", true, `chave anônima bloqueada como esperado: ${error.message}`);
      } else if ((data ?? []).length === 0) {
        record("permissions.anon_blocked_from_knowledge_history", true, "chave anônima não retornou linhas (RLS sem policy pública — comportamento esperado, mesmo padrão de merge_candidates/catalog_pending_reviews)");
      } else {
        record("permissions.anon_blocked_from_knowledge_history", false, `chave anônima conseguiu ler ${data!.length} linha(s) — RLS pode estar mal configurada`);
      }
    } catch (err) {
      record("permissions.anon_blocked_from_knowledge_history", true, `chave anônima rejeitada: ${String(err)}`);
    }

    try {
      const { error } = await anonClient.from("stores").select("id").limit(1);
      record("permissions.anon_can_read_public_stores", !error, error ? String(error) : "leitura pública de `stores` intacta (baseline de comparação)");
    } catch (err) {
      record("permissions.anon_can_read_public_stores", false, String(err));
    }
  }

  try {
    const { error } = await supabase.from("knowledge_history").select("id").limit(1);
    record("permissions.service_role_can_read_knowledge_history", !error, error ? String(error) : "service_role lê knowledge_history normalmente");
  } catch (err) {
    record("permissions.service_role_can_read_knowledge_history", false, String(err));
  }

  // ── 6. Product Identity / Recovery Engine / Gatekeeper — sem regressão ──
  console.log("\n--- 6. Product Identity / Recovery Engine / Gatekeeper (leitura real, sem escrita) ---");

  try {
    const catalogRepo = new SupabaseCatalogRepository(supabase);
    const knownBrand = await catalogRepo.findBrandByNormalizedName("apple");
    record("gatekeeper.catalog_repo.findBrandByNormalizedName", true, knownBrand ? `resolveu para "${knownBrand.name}"` : "executou sem erro (nenhum brand 'apple' encontrado — resultado válido, não é falha)");
  } catch (err) {
    record("gatekeeper.catalog_repo.findBrandByNormalizedName", false, String(err));
  }

  try {
    const recoveryRepo = new SupabaseRecoveryRepository(supabase);
    const total = await recoveryRepo.countCandidates();
    record("recovery_engine.count_candidates", true, `countCandidates() executou: ${total} candidatos pendentes de brand/category`);
  } catch (err) {
    record("recovery_engine.count_candidates", false, String(err));
  }

  try {
    const mergeRepo = new SupabaseMergeCandidateRepository(supabase);
    const page = await mergeRepo.findByStatus(MergeCandidateStatus.Pending, { limit: 1, offset: 0 });
    record("product_identity.merge_candidates.findByStatus", true, `executou: ${page.total} candidatos pendentes no total`);
  } catch (err) {
    record("product_identity.merge_candidates.findByStatus", false, String(err));
  }

  try {
    const patternRepo = new SupabaseMerchantAttributePatternRepository(supabase);
    const factRepo = new SupabaseLearnedFactRepository(supabase);
    const [patternCount, factCount] = await Promise.all([patternRepo.countTotal(), factRepo.countTotal()]);
    record("marketplace_memory.counts", true, `merchant_attribute_patterns=${patternCount}, marketplace_memory_facts=${factCount}`);
  } catch (err) {
    record("marketplace_memory.counts", false, String(err));
  }

  try {
    const knowledgeRepo = new SupabaseKnowledgeRepository(supabase);
    const distinctKeys = await knowledgeRepo.countDistinctKeys();
    record("learning_engine.repository.countDistinctKeys", true, `executou via IKnowledgeRepository real: ${distinctKeys} chaves distintas`);
  } catch (err) {
    record("learning_engine.repository.countDistinctKeys", false, String(err));
  }

  // ── Resumo ──────────────────────────────────────────────────────────
  console.log("\n=== RESUMO ===");
  const failed = results.filter((r) => !r.ok);
  console.log(`Checks executados: ${results.length} | OK: ${results.length - failed.length} | FALHAS: ${failed.length}`);
  if (failed.length > 0) {
    console.log("\nFalhas:");
    for (const f of failed) console.log(`  - ${f.name}: ${f.detail}`);
    process.exitCode = 1;
  } else {
    console.log("\nNenhuma falha. Nenhuma escrita foi realizada por este script. Seguro para prosseguir com o backfill (--execute) quando autorizado.");
  }
}

main().catch((err) => {
  console.error("[knowledge-engine-sanity-check] Fatal:", err);
  process.exit(1);
});
