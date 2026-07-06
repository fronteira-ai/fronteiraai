import { MarketChangeEntityType } from "../enums";
import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { FreshnessScore } from "../types";
import { FreshnessEngine } from "./FreshnessEngine";

/** Epic 4 — compute-on-read, no snapshot table (same posture as Volatility). */
export class FreshnessService {
  private readonly engine = new FreshnessEngine();

  constructor(private readonly repo: IMarketChangeRepository) {}

  /**
   * `fallbackUpdatedAt` covers offers that predate this Wave (or were never
   * touched by a detected change) — callers that already have the offer row
   * pass its `updated_at` so freshness degrades gracefully instead of always
   * reporting Stale for the entire pre-Wave catalog. Domain never queries
   * `offers` directly (Epic 1: no dependency on other domains' tables).
   */
  async computeForOffer(offerId: string, fallbackUpdatedAt?: Date | null): Promise<FreshnessScore> {
    const latest = await this.repo.latestForEntity(MarketChangeEntityType.Offer, offerId);
    const lastChangeAt = latest ? new Date(latest.detectedAt) : (fallbackUpdatedAt ?? null);
    return this.engine.score(offerId, lastChangeAt);
  }
}
