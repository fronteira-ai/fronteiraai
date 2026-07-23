import { KnowledgeIngestionService } from "../services/KnowledgeIngestionService";
import { InMemoryKnowledgeRepository } from "./InMemoryKnowledgeRepository";
import { LOCAL_PROMOTION_THRESHOLD } from "../types/enums";

describe("KnowledgeIngestionService.ingestResolvedPattern", () => {
  it("skips a pattern that was never confirmed by an operator (resolvedValue absent)", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);

    const outcome = await service.ingestResolvedPattern({ id: "p1", storeId: "store-1", rawKey: "MODELO", concept: "brand", resolvedValue: "", occurrences: 1 });

    expect(outcome.kind).toBe("skipped-unconfirmed");
    expect(repo.rows).toHaveLength(0);
  });

  it("creates version 1 at local scope for a first confirmed observation", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);

    const outcome = await service.ingestResolvedPattern({ id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand", resolvedValue: "Apple", occurrences: 1 });

    expect(outcome.kind).toBe("created");
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ version: 1, scope: "local", resolvedValue: "Apple", confidence: "medium" });
  });

  it("is idempotent — re-ingesting the identical confirmed state never appends a duplicate version", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);
    const source = { id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand" as const, resolvedValue: "Apple", occurrences: 1 };

    await service.ingestResolvedPattern(source);
    const second = await service.ingestResolvedPattern(source);

    expect(second.kind).toBe("unchanged");
    expect(repo.rows).toHaveLength(1);
  });

  it("appends a NEW version (never overwrites) when occurrences grow, and crosses to high confidence at the recurrence floor", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);
    const base = { id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand" as const, resolvedValue: "Apple" };

    await service.ingestResolvedPattern({ ...base, occurrences: 1 });
    const outcome = await service.ingestResolvedPattern({ ...base, occurrences: LOCAL_PROMOTION_THRESHOLD * 2 });

    expect(outcome.kind).toBe("versioned");
    expect(repo.rows).toHaveLength(2);
    expect(repo.rows[0].version).toBe(1);
    expect(repo.rows[1].version).toBe(2);
    expect(repo.rows[1].confidence).toBe("high");
    // Version 1 is untouched — never rewritten.
    expect(repo.rows[0].resolvedValue).toBe("Apple");
  });

  it("records a conflict (and still appends, never drops) when a new confirmation disagrees with the current value", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);
    const base = { id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand" as const, occurrences: 1 };

    await service.ingestResolvedPattern({ ...base, resolvedValue: "Apple" });
    const outcome = await service.ingestResolvedPattern({ ...base, id: "p2", resolvedValue: "Apple Computer" });

    expect(outcome).toMatchObject({ kind: "conflict", previousValue: "Apple", incomingValue: "Apple Computer" });
    expect(repo.rows).toHaveLength(2);
    expect(repo.rows[1].isConflict).toBe(true);
    expect(repo.rows[0].resolvedValue).toBe("Apple"); // history preserved, not overwritten
  });
});

describe("KnowledgeIngestionService.ingestRecoveryDecision", () => {
  it("skips layer=merchant_memory — already captured via pattern ingestion", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);

    const outcome = await service.ingestRecoveryDecision({
      id: "d1",
      productId: "prod-1",
      fieldType: "brand",
      layer: "merchant_memory",
      previousValue: "Outros",
      recoveredValue: "Apple",
      confidence: "high",
      evidence: "test",
    });

    expect(outcome.kind).toBe("skipped-duplicate-source");
    expect(repo.rows).toHaveLength(0);
  });

  it("ingests a non-merchant-memory layer directly at global scope", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);

    const outcome = await service.ingestRecoveryDecision({
      id: "d1",
      productId: "prod-1",
      fieldType: "brand",
      layer: "product_signature",
      previousValue: "Outros",
      recoveredValue: "Apple",
      confidence: "high",
      evidence: "shared EAN",
    });

    expect(outcome.kind).toBe("created");
    expect(repo.rows[0]).toMatchObject({ scope: "global", storeId: null, resolvedValue: "Apple" });
  });
});

describe("KnowledgeIngestionService.ingestConfirmedFact", () => {
  it("scopes local when merchantId is present, global when null", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const service = new KnowledgeIngestionService(repo);

    await service.ingestConfirmedFact({ id: "f1", canonicalProductId: "cp-1", factType: "manufacturer_code", factValue: "A3257", confidence: "high", merchantId: "store-1" });
    await service.ingestConfirmedFact({ id: "f2", canonicalProductId: "cp-2", factType: "manufacturer_code", factValue: "A3258", confidence: "high", merchantId: null });

    expect(repo.rows.find((r) => r.rawValue === "A3257")).toMatchObject({ scope: "local", storeId: "store-1" });
    expect(repo.rows.find((r) => r.rawValue === "A3258")).toMatchObject({ scope: "global", storeId: null });
  });
});
