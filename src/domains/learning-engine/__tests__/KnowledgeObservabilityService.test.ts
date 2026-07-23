import { ASSUMED_MINUTES_PER_MANUAL_REVIEW, buildKnowledgeReport, countPendingReviewsAlreadyKnown } from "../services/KnowledgeObservabilityService";
import type { KnowledgeRecord } from "../domain/KnowledgeRecord";

function makeRecord(overrides: Partial<KnowledgeRecord>): KnowledgeRecord {
  return {
    id: `id-${Math.random()}`,
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
    sourceId: null,
    reason: "test",
    isConflict: false,
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-23T00:00:00Z",
    ...overrides,
  };
}

describe("buildKnowledgeReport", () => {
  it("counts distinct keys as knowledgeCreated, and reuse as occurrences beyond the first", () => {
    const history = [makeRecord({ knowledgeKey: "a", occurrences: 5, version: 1 }), makeRecord({ knowledgeKey: "b", occurrences: 1, version: 1 })];

    const report = buildKnowledgeReport(history, []);

    expect(report.knowledgeCreated).toBe(2);
    expect(report.knowledgeReused).toBe(4); // (5-1) + (1-1)
  });

  it("counts conflicts structurally (isConflict flag), never by parsing reason text", () => {
    const history = [
      makeRecord({ knowledgeKey: "a", version: 1, isConflict: false }),
      makeRecord({ knowledgeKey: "a", version: 2, isConflict: true, resolvedValue: "Apple Computer" }),
    ];

    const report = buildKnowledgeReport(history, []);

    expect(report.conflicts).toBe(1);
  });

  it("counts a reversal when a key's final resolvedValue differs from its first version", () => {
    const history = [
      makeRecord({ knowledgeKey: "a", version: 1, resolvedValue: "Apple" }),
      makeRecord({ knowledgeKey: "a", version: 2, resolvedValue: "Apple Inc" }),
    ];

    const report = buildKnowledgeReport(history, []);

    expect(report.reversals).toBe(1);
  });

  it("does not count a key as reversed when its value never actually changed net (only occurrences grew)", () => {
    const history = [
      makeRecord({ knowledgeKey: "a", version: 1, resolvedValue: "Apple", occurrences: 1 }),
      makeRecord({ knowledgeKey: "a", version: 2, resolvedValue: "Apple", occurrences: 5 }),
    ];

    const report = buildKnowledgeReport(history, []);

    expect(report.reversals).toBe(0);
  });

  it("precisionPercent is 100 (vacuous truth) when there is no global knowledge yet", () => {
    const report = buildKnowledgeReport([makeRecord({ scope: "local" })], []);
    expect(report.precisionPercent).toBe(100);
    expect(report.globalKnowledgeCount).toBe(0);
  });

  it("precisionPercent reflects the share of global keys whose history never had a conflict", () => {
    const history = [
      makeRecord({ knowledgeKey: "clean", scope: "global", version: 1, isConflict: false }),
      makeRecord({ knowledgeKey: "disputed", scope: "global", version: 1, isConflict: false }),
      makeRecord({ knowledgeKey: "disputed", scope: "global", version: 2, isConflict: true, resolvedValue: "X" }),
    ];

    const report = buildKnowledgeReport(history, []);

    expect(report.globalKnowledgeCount).toBe(2);
    expect(report.precisionPercent).toBe(50);
  });

  it("counts correctionsAutomated as every extra member of a resolved-review group beyond the first, and derives timeSaved from it", () => {
    const resolvedReviews = [
      { storeId: "store-1", fieldType: "brand", rawValue: "Apple Inc" },
      { storeId: "store-1", fieldType: "brand", rawValue: "Apple Inc" },
      { storeId: "store-1", fieldType: "brand", rawValue: "Apple Inc" },
      { storeId: "store-1", fieldType: "category", rawValue: "Notebook Gamer" },
    ];

    const report = buildKnowledgeReport([], resolvedReviews);

    expect(report.correctionsAutomated).toBe(2); // group of 3 -> 2 avoided
    expect(report.humanCorrectionsAvoided).toBe(2);
    expect(report.timeSavedMinutes).toBe(2 * ASSUMED_MINUTES_PER_MANUAL_REVIEW);
  });
});

describe("countPendingReviewsAlreadyKnown", () => {
  it("counts a pending review as already-known only when a matching local knowledge key exists", () => {
    const knowledge = [makeRecord({ scope: "local", storeId: "store-1", knowledgeType: "brand", rawValue: "Apple Inc" })];
    const pending = [
      { storeId: "store-1", fieldType: "brand", rawValue: "Apple Inc" },
      { storeId: "store-1", fieldType: "brand", rawValue: "Samsung Corp" },
    ];

    expect(countPendingReviewsAlreadyKnown(pending, knowledge)).toBe(1);
  });
});
