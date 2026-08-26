import type { LearnedFact } from "../domain/LearnedFact";
import type { FactType } from "../types/enums";
import type { LearnedFactInput, PaginatedResult, PaginationParams } from "../types/marketplace-memory.types";

export interface ILearnedFactRepository {
  /** All facts currently known for one product — the primary read path for
   * a future "read-before-calculate" Learning Service. */
  findByCanonicalProductId(canonicalProductId: string): Promise<LearnedFact[]>;

  /** Sprint 15B (egress) — a leitura em lote de `findByCanonicalProductId`.
   * ADITIVA: o método individual continua existindo e continua sendo usado
   * por `ProductIntelligenceComposer`, que lê um produto só.
   *
   * Contrato deliberadamente idêntico ao individual, produto a produto:
   * `get(id)` devolve exatamente o que `findByCanonicalProductId(id)`
   * devolveria. Um produto sem fatos simplesmente não aparece no Map — o
   * chamador trata ausência como `[]`, a mesma lista vazia que o individual
   * retornaria. Erro degrada para Map vazio, espelhando o `[]` do
   * individual, nunca lança. */
  findByCanonicalProductIds(canonicalProductIds: string[]): Promise<Map<string, LearnedFact[]>>;

  /** Every product sharing the same fact type+value — e.g. `(manufacturer_code,
   * "A3257")`. This is the exact grouping key Mission Π-1's simulation used
   * to measure the 28x Comparable Coverage ceiling; the index this query
   * relies on (`idx_mmf_type_value`) is why that migration exists. */
  findByTypeAndValue(factType: FactType, factValue: string): Promise<LearnedFact[]>;

  /** Idempotent upsert on (canonicalProductId, factType) — a re-run over an
   * unchanged product overwrites with the same value and a fresh
   * `updatedAt`, never creates a duplicate row (enforced by the DB UNIQUE
   * constraint, not just application logic). */
  upsert(input: LearnedFactInput): Promise<LearnedFact>;

  findAll(pagination: PaginationParams): Promise<PaginatedResult<LearnedFact>>;

  /** Read-only counts for observability (Objetivo 7) — never counts rows
   * client-side; always `count: "exact", head: true`, same discipline as
   * every other count in this codebase (MarketplaceHealthEngine, etc.). */
  countByFactType(factType: FactType): Promise<number>;
  countTotal(): Promise<number>;
}
