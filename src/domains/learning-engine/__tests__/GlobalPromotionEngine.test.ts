import { GlobalPromotionEngine } from "../services/GlobalPromotionEngine";
import { KnowledgeIngestionService } from "../services/KnowledgeIngestionService";
import { InMemoryKnowledgeRepository } from "./InMemoryKnowledgeRepository";

describe("GlobalPromotionEngine", () => {
  it("does not promote when only one store has confirmed the value", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const ingestion = new KnowledgeIngestionService(repo);
    const engine = new GlobalPromotionEngine(repo);

    await ingestion.ingestResolvedPattern({ id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand", resolvedValue: "Apple", occurrences: 1 });

    const result = await engine.evaluate("brand", "Apple");

    expect(result.kind).toBe("not-eligible");
    expect(repo.rows.filter((r) => r.scope === "global")).toHaveLength(0);
  });

  it("promotes to global once 2 independent stores confirm the same resolved value, even with different raw spellings", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const ingestion = new KnowledgeIngestionService(repo);
    const engine = new GlobalPromotionEngine(repo);

    await ingestion.ingestResolvedPattern({ id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand", resolvedValue: "Apple", occurrences: 3 });
    await ingestion.ingestResolvedPattern({ id: "p2", storeId: "store-2", rawKey: "APPLE INC.", concept: "brand", resolvedValue: "Apple", occurrences: 5 });

    const result = await engine.evaluate("brand", "Apple");

    expect(result.kind).toBe("created");
    const globalRow = repo.rows.find((r) => r.scope === "global");
    expect(globalRow).toMatchObject({ resolvedValue: "Apple", distinctStoreCount: 2, occurrences: 8, confidence: "high" });
  });

  it("is idempotent — evaluating twice with no new evidence never appends a duplicate global version", async () => {
    const repo = new InMemoryKnowledgeRepository();
    const ingestion = new KnowledgeIngestionService(repo);
    const engine = new GlobalPromotionEngine(repo);

    await ingestion.ingestResolvedPattern({ id: "p1", storeId: "store-1", rawKey: "Apple Inc", concept: "brand", resolvedValue: "Apple", occurrences: 1 });
    await ingestion.ingestResolvedPattern({ id: "p2", storeId: "store-2", rawKey: "APPLE INC.", concept: "brand", resolvedValue: "Apple", occurrences: 1 });

    await engine.evaluate("brand", "Apple");
    const second = await engine.evaluate("brand", "Apple");

    expect(second.kind).toBe("unchanged");
    expect(repo.rows.filter((r) => r.scope === "global")).toHaveLength(1);
  });
});
