import type { GrowthStrategy } from "./GrowthStrategy";
import type { GrowthStrategyType } from "../types/enums";

const registry = new Map<GrowthStrategyType, GrowthStrategy>();

export const StrategyRegistry = {
  register(strategy: GrowthStrategy): void {
    if (registry.has(strategy.id)) {
      console.warn(`[GrowthEngine] Strategy "${strategy.id}" already registered — overwriting.`);
    }
    registry.set(strategy.id, strategy);
  },

  getById(id: GrowthStrategyType): GrowthStrategy | undefined {
    return registry.get(id);
  },

  getAll(): GrowthStrategy[] {
    return [...registry.values()];
  },

  count(): number {
    return registry.size;
  },

  ids(): GrowthStrategyType[] {
    return [...registry.keys()];
  },
};
