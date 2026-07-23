import { classifyTier, computeConfidence, hasChanged, isConflict, knowledgeKeyFor, nextVersion } from "../domain/ConfidenceEngine";
import { GLOBAL_MIN_INDEPENDENT_STORES, LOCAL_PROMOTION_THRESHOLD } from "../types/enums";
import type { KnowledgeRecord } from "../domain/KnowledgeRecord";

function makeRecord(overrides: Partial<KnowledgeRecord> = {}): KnowledgeRecord {
  return {
    id: "rec-1",
    knowledgeKey: "brand:store-1:Apple Inc",
    knowledgeType: "brand",
    scope: "local",
    storeId: "store-1",
    rawValue: "Apple Inc",
    resolvedValue: "Apple",
    confidence: "medium",
    occurrences: 1,
    distinctStoreCount: 1,
    version: 1,
    sourceSystem: "pending_review_resolution",
    sourceId: "review-1",
    reason: "test",
    isConflict: false,
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-23T00:00:00Z",
    ...overrides,
  };
}

describe("ConfidenceEngine.classifyTier", () => {
  it("stays local below the recurrence threshold regardless of store count", () => {
    expect(classifyTier(LOCAL_PROMOTION_THRESHOLD - 1, GLOBAL_MIN_INDEPENDENT_STORES + 5)).toBe("local");
  });

  it("stays local at/above the threshold but with fewer than the required independent stores", () => {
    expect(classifyTier(LOCAL_PROMOTION_THRESHOLD, GLOBAL_MIN_INDEPENDENT_STORES - 1)).toBe("local");
  });

  it("promotes to global only once BOTH recurrence and independent-store thresholds are met", () => {
    expect(classifyTier(LOCAL_PROMOTION_THRESHOLD, GLOBAL_MIN_INDEPENDENT_STORES)).toBe("global");
  });
});

describe("ConfidenceEngine.computeConfidence", () => {
  it("global is always high", () => {
    expect(computeConfidence("global", 1)).toBe("high");
  });

  it("local below the high-confidence floor is medium", () => {
    expect(computeConfidence("local", LOCAL_PROMOTION_THRESHOLD)).toBe("medium");
  });

  it("local at/above the high-confidence floor is high", () => {
    expect(computeConfidence("local", LOCAL_PROMOTION_THRESHOLD * 2)).toBe("high");
  });
});

describe("ConfidenceEngine.nextVersion", () => {
  it("starts at 1 when nothing exists yet", () => {
    expect(nextVersion(null)).toBe(1);
  });

  it("increments by exactly 1 from the latest", () => {
    expect(nextVersion(makeRecord({ version: 7 }))).toBe(8);
  });
});

describe("ConfidenceEngine.hasChanged", () => {
  it("is always true when nothing exists yet", () => {
    expect(hasChanged(null, { resolvedValue: "Apple", scope: "local", confidence: "medium", occurrences: 1, distinctStoreCount: 1 })).toBe(true);
  });

  it("is false when every tracked field is identical", () => {
    const latest = makeRecord();
    expect(hasChanged(latest, { resolvedValue: latest.resolvedValue, scope: latest.scope, confidence: latest.confidence, occurrences: latest.occurrences, distinctStoreCount: latest.distinctStoreCount })).toBe(false);
  });

  it("is true when only occurrences grew", () => {
    const latest = makeRecord({ occurrences: 3 });
    expect(hasChanged(latest, { resolvedValue: latest.resolvedValue, scope: latest.scope, confidence: latest.confidence, occurrences: 4, distinctStoreCount: latest.distinctStoreCount })).toBe(true);
  });
});

describe("ConfidenceEngine.isConflict", () => {
  it("is false when nothing exists yet — a first observation is never a conflict", () => {
    expect(isConflict(null, "Apple")).toBe(false);
  });

  it("is false when the incoming value matches the latest", () => {
    expect(isConflict(makeRecord({ resolvedValue: "Apple" }), "Apple")).toBe(false);
  });

  it("is true when the incoming value disagrees with the latest", () => {
    expect(isConflict(makeRecord({ resolvedValue: "Apple" }), "Apple Inc.")).toBe(true);
  });
});

describe("ConfidenceEngine.knowledgeKeyFor", () => {
  it("scopes the key by store for local knowledge", () => {
    expect(knowledgeKeyFor("brand", "local", "store-1", "Apple Inc")).toBe("brand:store-1:Apple Inc");
  });

  it("scopes the key as 'global' regardless of the storeId argument for global knowledge", () => {
    expect(knowledgeKeyFor("brand", "global", null, "Apple")).toBe("brand:global:Apple");
  });
});
