import { RuleRegistry } from "../rules/RuleRegistry";
import { bootstrapRules } from "../rules/bootstrap";
import { RecommendationCategory, RecommendationPriority, EstimatedEffort } from "../types/enums";
import type { Rule, RuleResult } from "../rules/Rule";

function makeTestRule(id: string, category = RecommendationCategory.Catalog): Rule {
  return {
    id,
    name: `Test Rule ${id}`,
    description: "Test",
    category,
    defaultPriority: RecommendationPriority.Medium,
    evaluate(): RuleResult | null {
      return {
        rule_id: id,
        category,
        priority: RecommendationPriority.Medium,
        title: "Test",
        description: "Test",
        expected_impact: "Test",
        estimated_effort: EstimatedEffort.Minutes,
        estimated_minutes: 5,
        reason: "Test",
        evidence: [],
        data_sources: [],
        action_url: null,
        action_label: null,
        expires_at: null,
      };
    },
  };
}

describe("RuleRegistry", () => {
  beforeAll(() => {
    bootstrapRules();
  });

  it("registers all 11 rules from bootstrap", () => {
    expect(RuleRegistry.count()).toBe(11);
  });

  it("getById returns the correct rule", () => {
    const rule = RuleRegistry.getById("catalog.image_coverage");
    expect(rule).toBeDefined();
    expect(rule?.id).toBe("catalog.image_coverage");
  });

  it("getById returns undefined for unknown id", () => {
    expect(RuleRegistry.getById("unknown.rule")).toBeUndefined();
  });

  it("getByCategory filters correctly", () => {
    const catalogRules = RuleRegistry.getByCategory(RecommendationCategory.Catalog);
    expect(catalogRules.length).toBeGreaterThanOrEqual(3);
    catalogRules.forEach((r) => expect(r.category).toBe(RecommendationCategory.Catalog));
  });

  it("ids returns all registered rule ids", () => {
    const ids = RuleRegistry.ids();
    expect(ids).toContain("catalog.image_coverage");
    expect(ids).toContain("trust.no_verification");
    expect(ids).toContain("analytics.high_views_low_contact");
    expect(ids).toContain("profile.no_contact");
  });

  it("register overwrites duplicate ids with a warning", () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const dup = makeTestRule("catalog.image_coverage");
    RuleRegistry.register(dup);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("catalog.image_coverage"));
    warnSpy.mockRestore();
    // Re-register the real rule to avoid polluting other tests
    bootstrapRules();
  });

  it("getAll returns an array of Rule objects", () => {
    const rules = RuleRegistry.getAll();
    expect(Array.isArray(rules)).toBe(true);
    rules.forEach((r) => {
      expect(typeof r.id).toBe("string");
      expect(typeof r.evaluate).toBe("function");
    });
  });
});
