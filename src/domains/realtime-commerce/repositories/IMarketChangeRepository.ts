import type { ChangeType } from "../enums";
import type { CreateMarketChangeInput, MarketChange } from "../types";

export interface CountFilter {
  changeTypes?: ChangeType[];
}

export interface IMarketChangeRepository {
  /** Always an INSERT batch — market_changes is append-only. */
  insertMany(inputs: CreateMarketChangeInput[]): Promise<MarketChange[]>;

  /** Indexed COUNT, not a row fetch — safe at scale for Market Pulse tallies. */
  countInRange(from: Date, to: Date, filter?: CountFilter): Promise<number>;

  /**
   * Bounded row fetch for in-process aggregation (top movers, category/store
   * breakdowns, live activity feed). Deliberately capped by `limit` — see
   * TECH_DEBT.md "Market Pulse aggregation bound" for the scale note: past a
   * few hundred stores this should become a SQL GROUP BY / materialized view
   * instead of JS-side aggregation over a bounded sample.
   */
  listInRange(from: Date, to: Date, limit: number): Promise<MarketChange[]>;

  /**
   * Freshness Engine: most recent change recorded for one offer.
   *
   * Sprint 13B — "mais recente" é, exatamente: maior `detectedAt` e, em
   * empate, maior `id`. O empate acontece de verdade (mudanças gravadas no
   * mesmo instante), e sem o segundo critério a linha escolhida ficava a
   * cargo do plano do Postgres. Esta é a MESMA regra de `latestForEntities`:
   * as duas leituras têm de poder ser trocadas uma pela outra.
   */
  latestForEntity(entityType: string, entityId: string): Promise<MarketChange | null>;

  /**
   * Sprint 13 — versão em lote de `latestForEntity`, para quem precisa do
   * frescor de várias ofertas de uma vez (hoje o
   * `ComparisonIntelligenceComposer`, que emitia uma consulta por oferta da
   * página de comparação).
   *
   * Equivalente, entidade por entidade, a chamar `latestForEntity` N vezes:
   * mesma tabela, mesmas colunas, mesmo critério (maior `detectedAt` e, em
   * empate, maior `id` — Sprint 13B). Muda apenas quantas viagens ao banco
   * acontecem: a LINHA devolvida para cada entidade é a mesma.
   *
   * Entidades sem nenhuma mudança registrada simplesmente não aparecem no
   * Map — nunca uma entrada nula fabricada. Cabe ao chamador aplicar o
   * mesmo fallback que já aplicava (ver FreshnessService).
   */
  latestForEntities(entityType: string, entityIds: string[]): Promise<Map<string, MarketChange>>;

  /** Volatility Engine: full change history of one product's offers. */
  listForProduct(productId: string, from: Date, to: Date): Promise<MarketChange[]>;

  /** Store Update Intelligence: full change history of one store. */
  listForStore(storeId: string, from: Date, to: Date, limit: number): Promise<MarketChange[]>;
}
