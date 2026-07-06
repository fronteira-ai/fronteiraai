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

  /** Freshness Engine: most recent change recorded for one offer. */
  latestForEntity(entityType: string, entityId: string): Promise<MarketChange | null>;

  /** Volatility Engine: full change history of one product's offers. */
  listForProduct(productId: string, from: Date, to: Date): Promise<MarketChange[]>;

  /** Store Update Intelligence: full change history of one store. */
  listForStore(storeId: string, from: Date, to: Date, limit: number): Promise<MarketChange[]>;
}
