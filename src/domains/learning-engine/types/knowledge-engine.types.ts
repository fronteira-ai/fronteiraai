import type { FactConfidence } from "@/src/domains/marketplace-memory";
import type { KnowledgeScope, KnowledgeSourceSystem, KnowledgeType } from "./enums";

/** One confirmed MerchantAttributePattern — the mission's clearest example
 * ("Correção passa a ser aplicada automaticamente para a mesma loja").
 * `resolvedValue` non-null is the ingestion guard: a pattern without it was
 * never confirmed by a human (Question 5 of the Firewall), so it is never
 * read by this service (LIMITAÇÕES: "nunca aprender de... inferências sem
 * confirmação"). */
export interface ResolvedPatternSource {
  id: string;
  storeId: string;
  rawKey: string;
  concept: KnowledgeType;
  resolvedValue: string;
  occurrences: number;
}

/** One row of catalog_recovery_decisions — by construction already
 * confirmed (the Recovery Engine only ever records a decision once one of
 * its 5 deterministic layers confirmed a value; a case it could not
 * confirm never gets a row here, it goes to catalog_pending_reviews
 * instead). `layer: "merchant_memory"` is deliberately never ingested by
 * this source — that evidence is already a MerchantAttributePattern,
 * ingested via ResolvedPatternSource; ingesting it again here would
 * duplicate the same underlying human correction in the ledger. */
export interface RecoveryDecisionSource {
  id: string;
  productId: string;
  fieldType: KnowledgeType;
  layer: "product_signature" | "canonical_catalog" | "merchant_memory" | "universal_taxonomy" | "brand_normalization";
  previousValue: string | null;
  recoveredValue: string;
  confidence: FactConfidence;
  evidence: string;
}

/** One LearnedFact with validationStatus="confirmed" — Marketplace Memory
 * Foundation's (Ω-1) own confirmed tier. Every other validationStatus
 * ("unvalidated", "invalidated") is never read by this service. */
export interface ConfirmedFactSource {
  id: string;
  canonicalProductId: string;
  factType: KnowledgeType;
  factValue: string;
  confidence: FactConfidence;
  merchantId: string | null;
}

/** Input to append one new version — everything except `id`/`createdAt`,
 * assigned by the repository. `version` is NOT here: the repository (or
 * the service just above it) always computes it from the latest row for
 * the same `knowledgeKey`, never accepted from a caller (prevents a stale
 * caller from ever regressing the version counter). */
export interface KnowledgeRecordInput {
  knowledgeKey: string;
  knowledgeType: KnowledgeType;
  scope: KnowledgeScope;
  storeId: string | null;
  rawValue: string;
  resolvedValue: string;
  confidence: FactConfidence;
  occurrences: number;
  distinctStoreCount: number;
  sourceSystem: KnowledgeSourceSystem;
  sourceId: string | null;
  reason: string;
  isConflict: boolean;
  algorithmVersion: string;
}

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

/** One outcome of a single ingestion attempt — returned by
 * KnowledgeIngestionService so callers (backfill script, observability)
 * can count without re-deriving from history. Never persisted itself —
 * a run-report shape only. */
export type IngestionOutcome =
  | { kind: "created"; knowledgeKey: string }
  | { kind: "versioned"; knowledgeKey: string; fromConfidence: FactConfidence; toConfidence: FactConfidence }
  | { kind: "conflict"; knowledgeKey: string; previousValue: string; incomingValue: string }
  | { kind: "unchanged"; knowledgeKey: string }
  | { kind: "skipped-unconfirmed"; reason: string }
  | { kind: "skipped-duplicate-source"; knowledgeKey: string; reason: string };
