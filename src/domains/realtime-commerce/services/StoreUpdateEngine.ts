/**
 * Epic 5 — Store Update Intelligence. Pure composite scoring over four
 * independently normalized (0-1) sub-signals, each capped at an explicit,
 * stated assumption — same discipline as VolatilityEngine:
 *  - updateFrequency: interval <= 0h saturates at 1, >= 24h floors at 0
 *  - reactionSpeed:   reacting immediately saturates at 1, >= 72h floors at 0
 *  - catalogStability: already 0-1 (1 - churn ratio), passed through
 *  - freshness:        already 0-100 (FreshnessEngine), rescaled to 0-1
 */
export interface StoreUpdateInputs {
  updateIntervalMinutes: number | null;
  reactionSpeedHours: number | null;
  catalogStability: number;
  freshnessScore: number;
}

export interface StoreUpdateComposite {
  updateScore: number;
  marketResponsiveness: number;
}

const UPDATE_INTERVAL_FLOOR_MINUTES = 24 * 60;
const REACTION_SPEED_FLOOR_HOURS = 72;

export class StoreUpdateEngine {
  compute(inputs: StoreUpdateInputs): StoreUpdateComposite {
    const updateFrequencyScore =
      inputs.updateIntervalMinutes === null
        ? 0
        : clamp01(1 - Math.min(1, inputs.updateIntervalMinutes / UPDATE_INTERVAL_FLOOR_MINUTES));

    const reactionScore =
      inputs.reactionSpeedHours === null
        ? 0.5 // unknown — neutral, not penalized
        : clamp01(1 - Math.min(1, inputs.reactionSpeedHours / REACTION_SPEED_FLOOR_HOURS));

    const stabilityScore = clamp01(inputs.catalogStability);
    const freshnessScore = clamp01(inputs.freshnessScore / 100);

    const marketResponsiveness = mean([updateFrequencyScore, reactionScore]);
    const updateScore = mean([updateFrequencyScore, reactionScore, stabilityScore, freshnessScore]);

    return {
      updateScore: Math.round(100 * updateScore),
      marketResponsiveness: Math.round(100 * marketResponsiveness),
    };
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}
