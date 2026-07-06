import { ChangeType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { MarketChange, StoreUpdateProfile } from "../types";
import { FreshnessEngine } from "../freshness/FreshnessEngine";
import { StoreUpdateEngine } from "./StoreUpdateEngine";

const PRICE_CHANGE_TYPES = [ChangeType.PriceIncreased, ChangeType.PriceDecreased];
const CATALOG_CHURN_TYPES = [ChangeType.OfferCreated, ChangeType.OfferRemoved, ChangeType.ProductCreated];
const REACTION_LOOKBACK_DAYS = 7;
const REACTION_SAMPLE_CAP = 20;
/** Two changes within this window are treated as the same sync event, not
 * two separate updates — avoids inflating update frequency from a single
 * multi-offer sync batch. */
const SYNC_EVENT_CLUSTER_MINUTES = 2;

export interface StoreUpdateOptions {
  windowDays?: number;
  /** Resolved by the composition layer from connectors' sync-run history —
   * this domain never depends on connectors' schema directly (Epic 1). */
  avgSyncTimeMs?: number | null;
}

export class StoreUpdateIntelligenceService {
  private readonly freshnessEngine = new FreshnessEngine();
  private readonly composite = new StoreUpdateEngine();

  constructor(private readonly repo: IMarketChangeRepository) {}

  async computeForStore(
    storeId: string,
    storeName: string,
    options: StoreUpdateOptions = {}
  ): Promise<StoreUpdateProfile> {
    const windowDays = options.windowDays ?? 30;
    const to = new Date();
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);

    const changes = await this.repo.listForStore(storeId, from, to, 5000);

    const updateIntervalMinutes = this.avgUpdateIntervalMinutes(changes);
    const catalogStability = this.catalogStability(changes);
    const freshness = this.freshnessEngine.score(storeId, changes[0] ? new Date(changes[0].detectedAt) : null);
    const reactionSpeedHours = await this.medianReactionSpeedHours(storeId, changes);

    const { updateScore, marketResponsiveness } = this.composite.compute({
      updateIntervalMinutes,
      reactionSpeedHours,
      catalogStability,
      freshnessScore: freshness.score,
    });

    return {
      storeId,
      storeName,
      updateScore,
      avgUpdateIntervalMinutes: updateIntervalMinutes,
      avgSyncTimeMs: options.avgSyncTimeMs ?? null,
      priceReactionSpeedHours: reactionSpeedHours,
      catalogStability: Math.round(100 * catalogStability),
      avgFreshnessScore: freshness.score,
      marketResponsiveness,
      rank: 0,
      sampleSize: changes.length,
    };
  }

  /** Ranks a batch of already-computed profiles by updateScore, descending. */
  rank(profiles: StoreUpdateProfile[]): StoreUpdateProfile[] {
    const sorted = [...profiles].sort((a, b) => b.updateScore - a.updateScore);
    return sorted.map((p, i) => ({ ...p, rank: i + 1 }));
  }

  private avgUpdateIntervalMinutes(changes: MarketChange[]): number | null {
    if (changes.length < 2) return null;

    const timestamps = [...new Set(changes.map((c) => new Date(c.detectedAt).getTime()))].sort((a, b) => a - b);

    const events: number[] = [];
    for (const t of timestamps) {
      const last = events[events.length - 1];
      if (last === undefined || t - last > SYNC_EVENT_CLUSTER_MINUTES * 60 * 1000) events.push(t);
    }

    if (events.length < 2) return null;

    const gaps = events.slice(1).map((t, i) => t - events[i]);
    const avgMs = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    return Math.round(avgMs / 60000);
  }

  private catalogStability(changes: MarketChange[]): number {
    if (changes.length === 0) return 1;
    const churnCount = changes.filter((c) => CATALOG_CHURN_TYPES.includes(c.changeType)).length;
    return Math.max(0, 1 - churnCount / changes.length);
  }

  /**
   * For each of this store's price changes, finds the nearest earlier price
   * change on the same product at a different store within the lookback
   * window — the gap is how long this store took to "react" to the market.
   * Median across a bounded sample (REACTION_SAMPLE_CAP) keeps this cheap;
   * null when there is no cross-store signal to compare against.
   */
  private async medianReactionSpeedHours(storeId: string, changes: MarketChange[]): Promise<number | null> {
    const priceChanges = changes
      .filter((c) => PRICE_CHANGE_TYPES.includes(c.changeType) && c.productId)
      .slice(0, REACTION_SAMPLE_CAP);

    if (priceChanges.length === 0) return null;

    const lookback = REACTION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
    const gapsHours: number[] = [];

    for (const change of priceChanges) {
      const changeTime = new Date(change.detectedAt).getTime();
      const from = new Date(changeTime - lookback);
      const to = new Date(changeTime);
      const productHistory = await this.repo.listForProduct(change.productId as string, from, to);

      const priorOtherStoreChanges = productHistory.filter(
        (c) => c.storeId !== storeId && PRICE_CHANGE_TYPES.includes(c.changeType) && new Date(c.detectedAt).getTime() < changeTime
      );

      if (priorOtherStoreChanges.length === 0) continue;

      const nearest = priorOtherStoreChanges.reduce((closest, c) =>
        new Date(c.detectedAt).getTime() > new Date(closest.detectedAt).getTime() ? c : closest
      );

      gapsHours.push((changeTime - new Date(nearest.detectedAt).getTime()) / (60 * 60 * 1000));
    }

    if (gapsHours.length === 0) return null;

    const sorted = [...gapsHours].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
}
