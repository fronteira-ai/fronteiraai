/**
 * Continuous Knowledge Engine — Backfill (Program Ω, Mission Ω-5).
 *
 * Populates `knowledge_history` for the first time from the marketplace's
 * ALREADY-CONFIRMED corrections — never from a raw sync, never from a
 * pending/unvalidated row:
 *
 *   1. merchant_attribute_patterns WHERE resolved_value IS NOT NULL
 *      (a human corrected this raw brand/category text for one store —
 *      PendingReviewResolutionService's Auto-Reparação, Mission Ω-Gatekeeper)
 *   2. catalog_recovery_decisions (every row is, by construction, already
 *      confirmed — the Recovery Engine only writes a row once one of its 5
 *      deterministic layers confirmed a value; layer=merchant_memory is
 *      skipped, it's the same evidence as #1)
 *   3. marketplace_memory_facts WHERE validation_status='confirmed'
 *
 * Then, for every distinct (knowledgeType, resolvedValue) touched, runs
 * GlobalPromotionEngine — promoting to "global" scope wherever the same
 * confirmed correction independently recurred in >=2 stores.
 *
 * Never touches products/offers/brands/categories/merchant_attribute_patterns/
 * catalog_recovery_decisions/marketplace_memory_facts — read-only against
 * every one of them. Only writes to `knowledge_history` (new, additive).
 *
 * Dry-run by default (same --execute convention as every other operational
 * script in this repository).
 *
 * Uso:
 *   npx tsx scripts/knowledge-engine-backfill.ts                # dry-run
 *   npx tsx scripts/knowledge-engine-backfill.ts --execute       # grava
 */

import { getServiceClient } from "./lib/client";
import {
  KnowledgeIngestionService,
  GlobalPromotionEngine,
  SupabaseKnowledgeRepository,
} from "@/src/domains/learning-engine";
import type { KnowledgeType } from "@/src/domains/learning-engine";

const EXECUTE = process.argv.includes("--execute");
const PAGE = 1000;

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

async function main() {
  console.log(`\n[knowledge-engine-backfill] Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

  const supabase = getServiceClient();
  const repo = new SupabaseKnowledgeRepository(supabase);
  const ingestion = new KnowledgeIngestionService(repo);
  const promotion = new GlobalPromotionEngine(repo);

  const outcomeCounts: Record<string, number> = {};
  const touchedForPromotion = new Set<string>(); // `${knowledgeType}|${resolvedValue}`

  function tally(outcomeKind: string) {
    outcomeCounts[outcomeKind] = (outcomeCounts[outcomeKind] ?? 0) + 1;
  }

  // ── 1. Confirmed merchant_attribute_patterns ─────────────────────────
  const patterns = await fetchAll<Record<string, unknown>>(async (from, to) =>
    await supabase.from("merchant_attribute_patterns").select("id, store_id, raw_key, concept, resolved_value, occurrences").not("resolved_value", "is", null).range(from, to)
  );
  console.log(`Confirmed merchant_attribute_patterns (resolved_value set): ${patterns.length}`);

  for (const p of patterns) {
    const source = {
      id: p.id as string,
      storeId: p.store_id as string,
      rawKey: p.raw_key as string,
      concept: p.concept as KnowledgeType,
      resolvedValue: p.resolved_value as string,
      occurrences: p.occurrences as number,
    };
    if (EXECUTE) {
      const outcome = await ingestion.ingestResolvedPattern(source);
      tally(outcome.kind);
      if (outcome.kind !== "skipped-unconfirmed") touchedForPromotion.add(`${source.concept}|${source.resolvedValue}`);
    } else {
      tally("would-ingest-pattern");
    }
  }

  // ── 2. catalog_recovery_decisions ─────────────────────────────────────
  const decisions = await fetchAll<Record<string, unknown>>(async (from, to) =>
    await supabase.from("catalog_recovery_decisions").select("id, product_id, field_type, layer, previous_value, recovered_value, confidence, evidence").range(from, to)
  );
  console.log(`catalog_recovery_decisions: ${decisions.length}`);

  for (const d of decisions) {
    const source = {
      id: d.id as string,
      productId: d.product_id as string,
      fieldType: d.field_type as KnowledgeType,
      layer: d.layer as "product_signature" | "canonical_catalog" | "merchant_memory" | "universal_taxonomy" | "brand_normalization",
      previousValue: d.previous_value as string | null,
      recoveredValue: d.recovered_value as string,
      confidence: d.confidence as "high" | "medium" | "low",
      evidence: d.evidence as string,
    };
    if (EXECUTE) {
      const outcome = await ingestion.ingestRecoveryDecision(source);
      tally(outcome.kind);
    } else {
      tally(source.layer === "merchant_memory" ? "would-skip-duplicate-source" : "would-ingest-recovery-decision");
    }
  }

  // ── 3. marketplace_memory_facts with validationStatus='confirmed' ────
  const facts = await fetchAll<Record<string, unknown>>(async (from, to) =>
    await supabase.from("marketplace_memory_facts").select("id, canonical_product_id, fact_type, fact_value, confidence, merchant_id").eq("validation_status", "confirmed").range(from, to)
  );
  console.log(`Confirmed marketplace_memory_facts: ${facts.length}`);

  for (const f of facts) {
    const source = {
      id: f.id as string,
      canonicalProductId: f.canonical_product_id as string,
      factType: f.fact_type as KnowledgeType,
      factValue: f.fact_value as string,
      confidence: f.confidence as "high" | "medium" | "low",
      merchantId: (f.merchant_id as string | null) ?? null,
    };
    if (EXECUTE) {
      const outcome = await ingestion.ingestConfirmedFact(source);
      tally(outcome.kind);
    } else {
      tally("would-ingest-confirmed-fact");
    }
  }

  console.log(`\n=== Ingestion outcomes ===`);
  console.log(outcomeCounts);

  // ── Global promotion pass ─────────────────────────────────────────────
  if (EXECUTE) {
    console.log(`\n[global-promotion] Evaluating ${touchedForPromotion.size} distinct (type, resolvedValue) pairs...`);
    const promotionOutcomes: Record<string, number> = {};
    for (const key of touchedForPromotion) {
      const [knowledgeType, resolvedValue] = key.split("|") as [KnowledgeType, string];
      const result = await promotion.evaluate(knowledgeType, resolvedValue);
      promotionOutcomes[result.kind] = (promotionOutcomes[result.kind] ?? 0) + 1;
    }
    console.log(`=== Global promotion outcomes ===`);
    console.log(promotionOutcomes);
  } else {
    console.log(`\n(dry-run — global promotion pass skipped; re-run with --execute to also run it)`);
  }

  console.log(`\n${EXECUTE ? "Knowledge written to knowledge_history." : "No writes (dry-run). Use --execute to apply."}`);
}

main().catch((err) => {
  console.error("[knowledge-engine-backfill] Fatal:", err);
  process.exit(1);
});
