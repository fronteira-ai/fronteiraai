import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import { StrategyRegistry } from "../strategies/StrategyRegistry";

export class RecommendationEngine {
  evaluate(ctx: GrowthContext): DraftRecommendation[] {
    const strategies = StrategyRegistry.getAll();
    const seen = new Set<string>();
    const results: DraftRecommendation[] = [];

    for (const strategy of strategies) {
      let recs: DraftRecommendation[];
      try {
        recs = strategy.evaluate(ctx);
      } catch (err) {
        console.error(`[GrowthEngine] Strategy "${strategy.id}" failed:`, err);
        continue;
      }

      for (const rec of recs) {
        if (seen.has(rec.id)) continue;
        seen.add(rec.id);
        results.push(rec);
      }
    }

    return results;
  }
}
