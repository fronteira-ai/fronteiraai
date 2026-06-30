import type { GrowthContext } from "../domain/GrowthContext";
import type { DraftRecommendation } from "../types/growth.types";
import type { GrowthCategory, GrowthStrategyType } from "../types/enums";

export interface GrowthStrategy {
  readonly id: GrowthStrategyType;
  readonly name: string;
  readonly category: GrowthCategory;
  evaluate(context: GrowthContext): DraftRecommendation[];
}
