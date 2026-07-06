import { VolatilityClass } from "../enums";
import type { VolatilityFactors, VolatilityScore } from "../types";

/** One price-change data point, already reduced to a percent move — pure
 * input, no dependency on MarketChange or Supabase row shapes. */
export interface PriceMovePoint {
  occurredAt: Date;
  percentChange: number;
}

/**
 * Epic 3 — Price Volatility Engine. Four explainable, independently-capped
 * factors averaged into a single 0-100 score. Every cap below is a stated
 * assumption, not a hidden magic number:
 *  - frequency:   >= 1 price change/day over the window saturates the score
 *  - amplitude:   an average swing of >= 25% per change saturates the score
 *  - velocity:    share of all changes that fall in the second half of the
 *                 window — 0.5 means "evenly spread", above that means
 *                 "accelerating recently"
 *  - persistence: net drift as a fraction of total absolute movement — 1.0
 *                 means every change moved the same direction (a trend), 0
 *                 means changes fully cancel out (oscillation)
 */
export class VolatilityEngine {
  private static readonly FREQUENCY_CAP_PER_DAY = 1.0;
  private static readonly AMPLITUDE_CAP_PERCENT = 0.25;

  score(productId: string, points: PriceMovePoint[], windowDays: number): VolatilityScore {
    const now = new Date().toISOString();

    if (points.length < 2) {
      return {
        productId,
        score: 0,
        classification: VolatilityClass.MuitoEstavel,
        factors: { frequency: 0, amplitude: 0, velocity: 0, persistence: 0 },
        sampleSize: points.length,
        windowDays,
        computedAt: now,
      };
    }

    const sorted = [...points].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    // Calendar-time midpoint of the window, not a count-based median index —
    // a median index always splits any monotonic series ~50/50 regardless of
    // clustering, which would make velocity structurally ~0.5 for every
    // input. Anchoring to "now" (points are always queried within the last
    // windowDays, see VolatilityService) makes velocity actually sensitive to
    // whether changes are concentrated recently or long ago.
    const midpoint = Date.now() - (windowDays / 2) * 24 * 60 * 60 * 1000;

    const frequencyRaw = sorted.length / windowDays;
    const frequency = clamp01(frequencyRaw / VolatilityEngine.FREQUENCY_CAP_PER_DAY);

    const meanAbsChange = mean(sorted.map((p) => Math.abs(p.percentChange)));
    const amplitude = clamp01(meanAbsChange / VolatilityEngine.AMPLITUDE_CAP_PERCENT);

    const secondHalfCount = sorted.filter((p) => p.occurredAt.getTime() >= midpoint).length;
    const velocity = clamp01(secondHalfCount / sorted.length);

    const netDrift = sum(sorted.map((p) => p.percentChange));
    const totalMovement = sum(sorted.map((p) => Math.abs(p.percentChange)));
    const persistence = totalMovement === 0 ? 0 : clamp01(Math.abs(netDrift) / totalMovement);

    const factors: VolatilityFactors = { frequency, amplitude, velocity, persistence };
    const score = Math.round(100 * mean([frequency, amplitude, velocity, persistence]));

    return {
      productId,
      score,
      classification: classify(score),
      factors,
      sampleSize: sorted.length,
      windowDays,
      computedAt: now,
    };
  }
}

function classify(score: number): VolatilityClass {
  if (score >= 80) return VolatilityClass.MuitoVolatil;
  if (score >= 60) return VolatilityClass.Volatil;
  if (score >= 40) return VolatilityClass.Moderado;
  if (score >= 20) return VolatilityClass.Estavel;
  return VolatilityClass.MuitoEstavel;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((acc, v) => acc + v, 0);
}
