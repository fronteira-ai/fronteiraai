// Epic 6 — Exchange Analytics. Pure functions only (no I/O) — the highest-
// value, easiest-to-test code in this Wave, per this project's established
// convention (see ProductHealthService/PrioritizationEngine precedent).
//
// Two of these (store reaction lag, category impact) are explicitly labeled
// PROXIES, not causal models — a rigorous causal attribution of "did this
// store react to this exact rate move" would be a data-science project
// beyond one Wave. The proxy is honest: correlation in time, not attribution.

export interface RatePoint {
  rate: number;
  capturedAt: string;
}

export interface RateVariation {
  startRate: number;
  endRate: number;
  variationPercent: number;
  minRate: number;
  maxRate: number;
}

export function computeRateVariation(rates: RatePoint[]): RateVariation | null {
  if (rates.length === 0) return null;
  const sorted = [...rates].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const startRate = sorted[0].rate;
  const endRate = sorted[sorted.length - 1].rate;
  const allRates = sorted.map((r) => r.rate);

  return {
    startRate,
    endRate,
    variationPercent: startRate !== 0 ? ((endRate - startRate) / startRate) * 100 : 0,
    minRate: Math.min(...allRates),
    maxRate: Math.max(...allRates),
  };
}

export interface SignificantMove {
  capturedAt: string;
  fromRate: number;
  toRate: number;
  deltaPercent: number;
}

const DEFAULT_SIGNIFICANT_MOVE_THRESHOLD_PERCENT = 1;

export function detectSignificantMoves(
  rates: RatePoint[],
  thresholdPercent = DEFAULT_SIGNIFICANT_MOVE_THRESHOLD_PERCENT
): SignificantMove[] {
  const sorted = [...rates].sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  const moves: SignificantMove[] = [];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.rate === 0) continue;

    const deltaPercent = ((curr.rate - prev.rate) / prev.rate) * 100;
    if (Math.abs(deltaPercent) >= thresholdPercent) {
      moves.push({ capturedAt: curr.capturedAt, fromRate: prev.rate, toRate: curr.rate, deltaPercent });
    }
  }

  return moves;
}

export interface StoreReactionLag {
  storeId: string;
  /** Proxy metric — time correlation with a rate move, not causal attribution. */
  averageLagHours: number | null;
  movesObserved: number;
}

export function computeStoreReactionLag(
  moves: SignificantMove[],
  priceHistoryByStore: Map<string, { recordedAt: string }[]>
): StoreReactionLag[] {
  const results: StoreReactionLag[] = [];

  for (const [storeId, entries] of priceHistoryByStore) {
    const sortedEntries = [...entries].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    const lagsHours: number[] = [];

    for (const move of moves) {
      const next = sortedEntries.find((e) => e.recordedAt > move.capturedAt);
      if (next) {
        const lagMs = new Date(next.recordedAt).getTime() - new Date(move.capturedAt).getTime();
        lagsHours.push(lagMs / (1000 * 60 * 60));
      }
    }

    results.push({
      storeId,
      averageLagHours: lagsHours.length > 0 ? lagsHours.reduce((sum, l) => sum + l, 0) / lagsHours.length : null,
      movesObserved: lagsHours.length,
    });
  }

  return results.sort((a, b) => (a.averageLagHours ?? Infinity) - (b.averageLagHours ?? Infinity));
}

export interface PriceChangeEvent {
  priceUsd: number;
  previousPriceUsd: number;
  recordedAt: string;
}

export interface CategoryImpact {
  categoryId: string;
  /** Simplified exposure metric — average magnitude of price change following a
   * significant rate move, not a causal model isolating currency effect from others. */
  averageAbsPriceChangePercent: number | null;
  changesObserved: number;
}

const DEFAULT_IMPACT_WINDOW_HOURS = 24;

export function computeCategoryImpact(
  moves: SignificantMove[],
  priceChangesByCategory: Map<string, PriceChangeEvent[]>,
  windowHours = DEFAULT_IMPACT_WINDOW_HOURS
): CategoryImpact[] {
  const results: CategoryImpact[] = [];

  for (const [categoryId, events] of priceChangesByCategory) {
    const pctChanges: number[] = [];

    for (const move of moves) {
      const moveTime = new Date(move.capturedAt).getTime();
      const windowEnd = moveTime + windowHours * 60 * 60 * 1000;

      for (const event of events) {
        const eventTime = new Date(event.recordedAt).getTime();
        if (eventTime >= moveTime && eventTime <= windowEnd && event.previousPriceUsd > 0) {
          pctChanges.push(Math.abs((event.priceUsd - event.previousPriceUsd) / event.previousPriceUsd) * 100);
        }
      }
    }

    results.push({
      categoryId,
      averageAbsPriceChangePercent:
        pctChanges.length > 0 ? pctChanges.reduce((sum, c) => sum + c, 0) / pctChanges.length : null,
      changesObserved: pctChanges.length,
    });
  }

  return results.sort((a, b) => (b.averageAbsPriceChangePercent ?? 0) - (a.averageAbsPriceChangePercent ?? 0));
}

export interface CatalogValueSnapshot {
  date: string;
  totalValueUsd: number;
}

export interface CatalogValueGrowth {
  startValue: number;
  endValue: number;
  growthPercent: number;
}

export function computeCatalogValueGrowth(snapshots: CatalogValueSnapshot[]): CatalogValueGrowth | null {
  if (snapshots.length < 2) return null;
  const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const startValue = sorted[0].totalValueUsd;
  const endValue = sorted[sorted.length - 1].totalValueUsd;

  return {
    startValue,
    endValue,
    growthPercent: startValue !== 0 ? ((endValue - startValue) / startValue) * 100 : 0,
  };
}

export interface OfferPriceRange {
  highestPriceUsd: number;
  currentPriceUsd: number;
}

export interface BuyerSavingsSummary {
  totalSavingsUsd: number;
  offersWithSavings: number;
}

export function computeBuyerSavings(offerPriceRanges: OfferPriceRange[]): BuyerSavingsSummary {
  let totalSavingsUsd = 0;
  let offersWithSavings = 0;

  for (const offer of offerPriceRanges) {
    const savings = offer.highestPriceUsd - offer.currentPriceUsd;
    if (savings > 0) {
      totalSavingsUsd += savings;
      offersWithSavings += 1;
    }
  }

  return { totalSavingsUsd, offersWithSavings };
}
