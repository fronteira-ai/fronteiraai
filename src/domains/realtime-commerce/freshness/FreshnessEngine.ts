import { FreshnessClass } from "../enums";
import type { FreshnessScore } from "../types";

/** Epic 4 — Freshness Engine. Age thresholds are the literal bands from the
 * Wave brief ("3 minutos", "12 minutos", "1 hora", "5 horas", "1 dia") —
 * Live/Fresh/Recent/Old boundaries below round those examples to clean,
 * stated cutoffs so the classification stays explainable. */
const LIVE_MAX_SECONDS = 5 * 60;
const FRESH_MAX_SECONDS = 60 * 60;
const RECENT_MAX_SECONDS = 6 * 60 * 60;
const OLD_MAX_SECONDS = 24 * 60 * 60;

/** Score anchors: (ageSeconds, score) pairs at each class boundary, linearly
 * interpolated between them and floored at 0 by 7 days. A smooth 0-100 signal
 * for ranking/display; FreshnessClass (below) is the discrete band buyers see. */
const SCORE_ANCHORS: Array<[number, number]> = [
  [0, 100],
  [LIVE_MAX_SECONDS, 90],
  [FRESH_MAX_SECONDS, 70],
  [RECENT_MAX_SECONDS, 50],
  [OLD_MAX_SECONDS, 25],
  [7 * 24 * 60 * 60, 0],
];

function interpolateScore(ageSeconds: number): number {
  if (ageSeconds <= 0) return 100;
  const last = SCORE_ANCHORS[SCORE_ANCHORS.length - 1];
  if (ageSeconds >= last[0]) return 0;

  for (let i = 0; i < SCORE_ANCHORS.length - 1; i++) {
    const [ageA, scoreA] = SCORE_ANCHORS[i];
    const [ageB, scoreB] = SCORE_ANCHORS[i + 1];
    if (ageSeconds >= ageA && ageSeconds <= ageB) {
      const t = (ageSeconds - ageA) / (ageB - ageA);
      return Math.round(scoreA + t * (scoreB - scoreA));
    }
  }
  return 0;
}

function classify(ageSeconds: number): FreshnessClass {
  if (ageSeconds <= LIVE_MAX_SECONDS) return FreshnessClass.Live;
  if (ageSeconds <= FRESH_MAX_SECONDS) return FreshnessClass.Fresh;
  if (ageSeconds <= RECENT_MAX_SECONDS) return FreshnessClass.Recent;
  if (ageSeconds <= OLD_MAX_SECONDS) return FreshnessClass.Old;
  return FreshnessClass.Stale;
}

export class FreshnessEngine {
  score(offerId: string, lastChangeAt: Date | null, now: Date = new Date()): FreshnessScore {
    if (!lastChangeAt) {
      return {
        offerId,
        score: 0,
        classification: FreshnessClass.Stale,
        ageSeconds: Number.POSITIVE_INFINITY,
        lastChangeAt: null,
      };
    }

    const ageSeconds = Math.max(0, (now.getTime() - lastChangeAt.getTime()) / 1000);
    return {
      offerId,
      score: interpolateScore(ageSeconds),
      classification: classify(ageSeconds),
      ageSeconds,
      lastChangeAt: lastChangeAt.toISOString(),
    };
  }
}
