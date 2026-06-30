import type { Rule } from "./Rule";
import type { RecommendationCategory } from "../types/enums";

// ── Rule Registry ─────────────────────────────────────────────────────────────
// Central registry for all merchant decision rules.
// Rules are registered at startup and queried by the RecommendationEngine.
// New rules: implement Rule interface and call RuleRegistry.register().

export class RuleRegistry {
  private static readonly rules = new Map<string, Rule>();

  static register(rule: Rule): void {
    if (this.rules.has(rule.id)) {
      console.warn(`[RuleRegistry] Duplicate rule id: ${rule.id} — overwriting`);
    }
    this.rules.set(rule.id, rule);
  }

  static getAll(): Rule[] {
    return Array.from(this.rules.values());
  }

  static getById(id: string): Rule | undefined {
    return this.rules.get(id);
  }

  static getByCategory(category: RecommendationCategory): Rule[] {
    return this.getAll().filter((r) => r.category === category);
  }

  static count(): number {
    return this.rules.size;
  }

  static ids(): string[] {
    return Array.from(this.rules.keys());
  }
}
