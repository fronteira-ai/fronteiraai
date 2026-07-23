// Program Ω — Mission Ω-5 (Continuous Knowledge Engine). Implements the
// Learning Engine that docs/architecture/MARKETPLACE_LEARNING_ENGINE.md,
// LEARNING_LIFECYCLE.md, CONFIDENCE_ENGINE.md, PATTERN_LEARNING.md and
// KNOWLEDGE_PROPAGATION.md (Mission Ξ-2, "proposta arquitetural pura")
// specified but explicitly did not build, and that
// marketplace-memory/services/MarketplaceMemoryService.ts's own docstring
// names as "Learning Engine, a future Mission" — this is that Mission.
//
// Every threshold below is the exact one those documents already named —
// never invented here. No AI, no ML, no statistical inference: recurrence
// counting and deterministic confirmation only (PATTERN_LEARNING.md
// §Objetivo 6, the explicit "não criar IA" restriction).

import type { PatternConcept } from "@/src/domains/marketplace-memory";

/** What kind of knowledge a record represents. Reuses PatternConcept
 * (brand/category/manufacturer_code/model/family/line/capacity_gb/ram_gb/
 * screen_size_in/color/voltage/power_w/ean/bundle_includes/processor/gpu)
 * — the exact closed list Marketplace Memory Foundation (Ω-1) already
 * defined. "Sinônimos" (Objetivo/brief) is deliberately NOT a stored type
 * here — it is a computed view over multiple KnowledgeRecords sharing the
 * same (storeId, knowledgeType) with different rawValue, never a duplicated
 * source of truth (see KnowledgeObservabilityService.listSynonymGroups). */
export type KnowledgeType = PatternConcept;

/** "local": confirmed for one specific store only. "global": the same
 * confirmed correction recurred across 2+ INDEPENDENT stores — the exact
 * global-promotion rule CONFIDENCE_ENGINE.md §3 and PATTERN_LEARNING.md
 * §Objetivo 6 specify ("evidência de que não é um acidente de um único
 * merchant"). Never any tier beyond these two — the brief asks for
 * confiança that rises, not a taxonomy of scopes. */
export type KnowledgeScope = "local" | "global";

/** Confirmed source systems the Continuous Knowledge Engine is allowed to
 * learn from — the mission's explicit "FONTES DE APRENDIZADO" list, closed.
 * Never "pending_review" (unresolved), never "recovery_pending",
 * never a raw sync/backfill LearnedFact that was never validated —
 * KnowledgeIngestionService enforces this at the type level: every ingest
 * method takes an input shape that only exists for an already-confirmed row. */
export type KnowledgeSourceSystem =
  /** PendingReviewResolutionService.resolve() — a human explicitly
   * corrected a raw brand/category value for one store (Catalog Integrity
   * Firewall's Auto-Reparação). */
  | "pending_review_resolution"
  /** CatalogRecoveryEngine's 5 deterministic layers, already recorded in
   * catalog_recovery_decisions — every row there is, by construction, a
   * confirmed recovery (never a rejected/pending one — those never get a
   * row, per the Recovery Engine's own migration comment). */
  | "catalog_recovery_decision"
  /** CanonicalMergeSuggestionService candidates with
   * MergeCandidateStatus.Approved — a human approved that two canonical
   * products are the same real-world product. */
  | "canonical_merge_approval"
  /** marketplace_memory_facts rows with validationStatus="confirmed" —
   * Marketplace Memory Foundation's (Ω-1) own confirmed tier, never
   * "unvalidated"/"invalidated". */
  | "learned_fact_confirmed";

/** Versions THIS Mission's ingestion/confidence mapping — same precedent as
 * PRODUCT_IDENTITY_ALGORITHM_VERSION and MARKETPLACE_MEMORY_ALGORITHM_VERSION.
 * Bump only when the ingestion/confidence RULES below change, never when an
 * upstream extractor changes (that is a different version, already tracked
 * on the source row). */
export const LEARNING_ENGINE_ALGORITHM_VERSION = "1.0.0";

/** PATTERN_LEARNING.md §Objetivo 6: "Aparece N vezes (limiar objetivo, ex.:
 * ≥10 ...) → promovida a alias LOCAL". The exact number that document
 * proposed, adopted here unchanged — a fixed, approved number, never a
 * hidden heuristic (same discipline as Merge Engine's possible=70 floor). */
export const LOCAL_PROMOTION_THRESHOLD = 10;

/** Above this many occurrences, a local pattern's own recurrence is strong
 * enough evidence to be reported at "high" confidence even without having
 * crossed into global scope yet (2x the promotion floor — never a new
 * external threshold, just this Mission's own multiple of the number above). */
export const HIGH_CONFIDENCE_OCCURRENCE_FLOOR = LOCAL_PROMOTION_THRESHOLD * 2;

/** CONFIDENCE_ENGINE.md §3 / PATTERN_LEARNING.md §Objetivo 6: promoted to
 * GLOBAL only once the same confirmed correction is observed in this many
 * INDEPENDENT stores — "evidência de que não é um acidente de um único
 * merchant". */
export const GLOBAL_MIN_INDEPENDENT_STORES = 2;
