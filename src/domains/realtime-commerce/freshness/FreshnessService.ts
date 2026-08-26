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

  /**
   * Sprint 13 — mesma conta de `computeForOffer`, para várias ofertas de uma
   * vez. Uma leitura em lote de `market_changes` no lugar de uma por oferta.
   *
   * Regra idêntica, oferta por oferta: usa o `detectedAt` da mudança mais
   * recente e, quando a oferta não tem nenhuma, cai no `fallbackUpdatedAt`
   * informado pelo chamador — inclusive quando esse fallback é ausente, caso
   * em que o Engine devolve Stale como sempre devolveu. O Engine não é tocado.
   */
  async computeForOffers(offers: { offerId: string; fallbackUpdatedAt?: Date | null }[]): Promise<Map<string, FreshnessScore>> {
    const latestByOfferId = await this.repo.latestForEntities(
      MarketChangeEntityType.Offer,
      offers.map((o) => o.offerId)
    );

    const scores = new Map<string, FreshnessScore>();
    for (const { offerId, fallbackUpdatedAt } of offers) {
      const latest = latestByOfferId.get(offerId);
      const lastChangeAt = latest ? new Date(latest.detectedAt) : (fallbackUpdatedAt ?? null);
      scores.set(offerId, this.engine.score(offerId, lastChangeAt));
    }
    return scores;
  }
}
