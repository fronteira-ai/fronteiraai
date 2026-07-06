import { ChangeType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { VolatilityScore } from "../types";
import { VolatilityEngine, type PriceMovePoint } from "./VolatilityEngine";

const PRICE_CHANGE_TYPES = [ChangeType.PriceIncreased, ChangeType.PriceDecreased];
const DEFAULT_WINDOW_DAYS = 30;

/** Epic 3 — compute-on-read, no snapshot table: volatility is always
 * recomputed from market_changes (same discipline as MerchantPriorityService
 * in marketplace-operations — nothing to keep in sync, nothing to go stale). */
export class VolatilityService {
  private readonly engine = new VolatilityEngine();

  constructor(private readonly repo: IMarketChangeRepository) {}

  async computeForProduct(productId: string, windowDays: number = DEFAULT_WINDOW_DAYS): Promise<VolatilityScore> {
    const to = new Date();
    const from = new Date(to.getTime() - windowDays * 24 * 60 * 60 * 1000);
    const changes = await this.repo.listForProduct(productId, from, to);

    const priceChanges = changes.filter((c) => PRICE_CHANGE_TYPES.includes(c.changeType));
    const points: PriceMovePoint[] = [];

    for (const change of priceChanges) {
      const before = change.previousValue !== null ? Number(change.previousValue) : null;
      const after = change.currentValue !== null ? Number(change.currentValue) : null;
      if (before === null || after === null || before === 0 || Number.isNaN(before) || Number.isNaN(after)) continue;

      points.push({ occurredAt: new Date(change.detectedAt), percentChange: (after - before) / before });
    }

    return this.engine.score(productId, points, windowDays);
  }
}
