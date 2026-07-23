/**
 * Continuous Knowledge Engine — Validation Report (Program Ω, Mission Ω-5).
 *
 * Read-only against every table it touches (knowledge_history,
 * catalog_pending_reviews, stores) — no writes anywhere. Answers the
 * mission's "VALIDAÇÃO" section directly, with real numbers from the live
 * database:
 *
 *   - Quanto do conhecimento acumulado foi reutilizado
 *   - Quantas correções humanas deixaram de ser necessárias
 *   - Quantos Pending Reviews foram evitados (a leitura honesta: quantos
 *     itens do backlog ATUAL de pending reviews já têm resposta conhecida)
 *
 * ...globally and broken down for the 5 connectors the mission names:
 * Shopping China, Mobile Zone, Atacado Connect, Mega Eletrônicos, Roma
 * Shopping.
 *
 * Uso:
 *   npx tsx scripts/knowledge-engine-validation-report.ts
 */

import { getServiceClient } from "./lib/client";
import { KnowledgeRecordMapper, buildKnowledgeReport, countPendingReviewsAlreadyKnown } from "@/src/domains/learning-engine";
import type { KnowledgeRecord, ResolvedReviewGroupKey } from "@/src/domains/learning-engine";

const PAGE = 1000;
const NAMED_STORE_SLUGS = ["shopping-china", "mobile-zone", "atacado-connect", "mega-eletronicos", "roma-shopping"];

async function fetchAll<T>(fn: (from: number, to: number) => Promise<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  let all: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await fn(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

async function main() {
  const supabase = getServiceClient();

  console.log("\n[knowledge-engine-validation] Fetching knowledge_history, catalog_pending_reviews, stores...\n");

  const historyRows = await fetchAll<Record<string, unknown>>(async (from, to) => await supabase.from("knowledge_history").select("*").range(from, to));
  const fullHistory: KnowledgeRecord[] = historyRows.map(KnowledgeRecordMapper.toDomain);

  const resolvedReviewRows = await fetchAll<{ store_id: string; field_type: string; raw_value: string }>(async (from, to) =>
    await supabase.from("catalog_pending_reviews").select("store_id, field_type, raw_value").eq("status", "resolved").range(from, to)
  );
  const resolvedReviews: ResolvedReviewGroupKey[] = resolvedReviewRows.map((r) => ({ storeId: r.store_id, fieldType: r.field_type, rawValue: r.raw_value }));

  const pendingReviewRows = await fetchAll<{ store_id: string; field_type: string; raw_value: string }>(async (from, to) =>
    await supabase.from("catalog_pending_reviews").select("store_id, field_type, raw_value").eq("status", "pending").range(from, to)
  );
  const pendingReviews: ResolvedReviewGroupKey[] = pendingReviewRows.map((r) => ({ storeId: r.store_id, fieldType: r.field_type, rawValue: r.raw_value }));

  const { data: storeRows } = await supabase.from("stores").select("id, slug, name").in("slug", NAMED_STORE_SLUGS);
  const stores = (storeRows ?? []) as { id: string; slug: string; name: string }[];

  console.log(`knowledge_history versions: ${fullHistory.length}`);
  console.log(`catalog_pending_reviews resolved: ${resolvedReviews.length} | pending (current backlog): ${pendingReviews.length}`);
  console.log(`Named stores found: ${stores.map((s) => s.name).join(", ") || "(none found — connectors may not have synced under these slugs yet)"}`);

  // ── Global report ─────────────────────────────────────────────────────
  const report = buildKnowledgeReport(fullHistory, resolvedReviews);
  const latestLocal = dedupeLatest(fullHistory).filter((r) => r.scope === "local");
  const pendingAlreadyKnown = countPendingReviewsAlreadyKnown(pendingReviews, latestLocal);

  console.log("\n=== RELATÓRIO GLOBAL (todo o marketplace) ===");
  console.log(`Conhecimentos criados (chaves distintas):        ${report.knowledgeCreated}`);
  console.log(`  — locais: ${report.localKnowledgeCount} | globais: ${report.globalKnowledgeCount}`);
  console.log(`Conhecimentos reutilizados (observações extras):  ${report.knowledgeReused}`);
  console.log(`Correções automáticas realizadas (histórico real): ${report.correctionsAutomated}`);
  console.log(`Correções humanas evitadas (mesmo fato):           ${report.humanCorrectionsAvoided}`);
  console.log(`Tempo economizado (estimado, ${2}min/revisão):      ${report.timeSavedMinutes} min (${fmt(report.timeSavedMinutes / 60)} h)`);
  console.log(`Precisão (conhecimento global sem conflito):       ${fmt(report.precisionPercent)}%`);
  console.log(`Conflitos registrados:                             ${report.conflicts}`);
  console.log(`Reversões (valor final != primeira versão):        ${report.reversals}`);
  console.log(`\nPending Reviews no backlog ATUAL:                  ${pendingReviews.length}`);
  console.log(`  — já cobertos por conhecimento confirmado hoje:  ${pendingAlreadyKnown} (nunca mais precisarão virar revisão nova, se o mesmo raw_value reaparecer)`);

  // ── Per-store breakdown ────────────────────────────────────────────────
  console.log("\n=== POR LOJA (as 5 nomeadas na Missão) ===");
  for (const slug of NAMED_STORE_SLUGS) {
    const store = stores.find((s) => s.slug === slug);
    if (!store) {
      console.log(`\n${slug}: loja não encontrada (sem sync ainda sob este slug)`);
      continue;
    }
    const storeHistory = fullHistory.filter((r) => r.storeId === store.id);
    const storeLatest = dedupeLatest(storeHistory);
    const storeResolvedReviews = resolvedReviews.filter((r) => r.storeId === store.id);
    const storeReport = buildKnowledgeReport(storeHistory, storeResolvedReviews);
    const storePendingKnown = countPendingReviewsAlreadyKnown(
      pendingReviews.filter((r) => r.storeId === store.id),
      storeLatest.filter((r) => r.scope === "local")
    );
    const storePendingTotal = pendingReviews.filter((r) => r.storeId === store.id).length;

    console.log(`\n${store.name} (${slug}):`);
    console.log(`  Conhecimentos locais confirmados: ${storeReport.localKnowledgeCount}`);
    console.log(`  Reutilizações (observações extras): ${storeReport.knowledgeReused}`);
    console.log(`  Correções automáticas (histórico real): ${storeReport.correctionsAutomated}`);
    console.log(`  Pending reviews atuais: ${storePendingTotal} (${storePendingKnown} já cobertos por conhecimento confirmado)`);
  }

  console.log("\n(Relatório somente leitura — nenhuma escrita realizada.)\n");
}

function dedupeLatest(rows: KnowledgeRecord[]): KnowledgeRecord[] {
  const byKey = new Map<string, KnowledgeRecord>();
  for (const r of rows) {
    const cur = byKey.get(r.knowledgeKey);
    if (!cur || r.version > cur.version) byKey.set(r.knowledgeKey, r);
  }
  return [...byKey.values()];
}

main().catch((err) => {
  console.error("[knowledge-engine-validation] Fatal:", err);
  process.exit(1);
});
