import { RecommendationEngine } from "../services/RecommendationEngine";
import { RecommendationStatus, RecommendationPriority } from "../types/enums";
import { makeContext, makeSummary, makeCatalog, makeAnalytics } from "./helpers";

describe("RecommendationEngine", () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  it("returns an array of Recommendation objects with required fields", () => {
    const recs = engine.generate(makeContext());
    expect(Array.isArray(recs)).toBe(true);
    if (recs.length > 0) {
      const rec = recs[0];
      expect(typeof rec.id).toBe("string");
      expect(typeof rec.rule_id).toBe("string");
      expect(rec.status).toBe(RecommendationStatus.Active);
      expect(typeof rec.created_at).toBe("string");
      expect(Array.isArray(rec.evidence)).toBe(true);
    }
  });

  it("generates StaleImportRule when no import ever", () => {
    const ctx = makeContext({ summary: makeSummary({ lastImportAt: null }) });
    const recs = engine.generate(ctx);
    const stale = recs.find((r) => r.rule_id === "catalog.stale_import");
    expect(stale).toBeDefined();
    expect(stale?.priority).toBe(RecommendationPriority.Critical);
  });

  it("generates TrustNoVerificationRule when verificationCount is 0", () => {
    const ctx = makeContext({ summary: makeSummary({ verificationCount: 0 }) });
    const recs = engine.generate(ctx);
    const trust = recs.find((r) => r.rule_id === "trust.no_verification");
    expect(trust).toBeDefined();
  });

  it("generates ProfileNoContactRule when contactsAvailable is 0", () => {
    const ctx = makeContext({ summary: makeSummary({ contactsAvailable: 0 }) });
    const recs = engine.generate(ctx);
    const profile = recs.find((r) => r.rule_id === "profile.no_contact");
    expect(profile).toBeDefined();
    expect(profile?.priority).toBe(RecommendationPriority.Critical);
  });

  it("generates HighViewsLowContactRule when views are high and contacts are 0", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({ views: 50, contact_clicks: 0 }),
    });
    const recs = engine.generate(ctx);
    const rule = recs.find((r) => r.rule_id === "analytics.high_views_low_contact");
    expect(rule).toBeDefined();
  });

  it("suppresses StaleImportRule for a recently-updated catalog", () => {
    const ctx = makeContext({
      summary: makeSummary({
        lastImportAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        daysSinceLastImport: 3,
      }),
    });
    const recs = engine.generate(ctx);
    const stale = recs.find((r) => r.rule_id === "catalog.stale_import");
    expect(stale).toBeUndefined();
  });

  it("does not throw when all fields are healthy (may return 0 recs)", () => {
    const healthyCtx = makeContext({
      summary: makeSummary({
        totalProducts: 50,
        activeProducts: 45,
        incompleteProducts: 0,
        trustScore: 80,
        verificationCount: 3,
        activeSignalCount: 5,
        contactsAvailable: 3,
        lastImportAt: new Date(Date.now() - 2 * 86400000).toISOString(),
        daysSinceLastImport: 2,
      }),
      analytics: makeAnalytics({ views: 100, contact_clicks: 15 }),
      catalog: makeCatalog({ healthScore: 90 }),
    });
    expect(() => engine.generate(healthyCtx)).not.toThrow();
  });

  it("recommendation id includes merchant id", () => {
    const ctx = makeContext({ summary: makeSummary({ lastImportAt: null }) });
    const recs = engine.generate(ctx);
    const stale = recs.find((r) => r.rule_id === "catalog.stale_import");
    expect(stale?.id).toContain("merchant-1");
  });
});
