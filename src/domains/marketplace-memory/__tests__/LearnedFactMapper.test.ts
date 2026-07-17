import { LearnedFactMapper } from "../mappers/LearnedFactMapper";
import { FactType } from "../types/enums";

describe("LearnedFactMapper", () => {
  it("maps a DB row (snake_case) to the domain entity (camelCase)", () => {
    const row = {
      id: "fact-1",
      canonical_product_id: "product-1",
      fact_type: "manufacturer_code",
      fact_value: "A3257",
      confidence: "medium",
      source: "name",
      extracted_from: "candidates: [A3257]",
      merchant_id: "store-1",
      origin: "backfill",
      validation_status: "unvalidated",
      algorithm_version: "1.0.0",
      created_at: "2026-07-16T00:00:00Z",
      updated_at: "2026-07-16T00:00:00Z",
    };

    expect(LearnedFactMapper.toDomain(row)).toEqual({
      id: "fact-1",
      canonicalProductId: "product-1",
      factType: "manufacturer_code",
      factValue: "A3257",
      confidence: "medium",
      source: "name",
      extractedFrom: "candidates: [A3257]",
      merchantId: "store-1",
      origin: "backfill",
      validationStatus: "unvalidated",
      algorithmVersion: "1.0.0",
      createdAt: "2026-07-16T00:00:00Z",
      updatedAt: "2026-07-16T00:00:00Z",
    });
  });

  it("defaults nullable fields (extracted_from, merchant_id) honestly, never fabricated", () => {
    const row = {
      id: "fact-1",
      canonical_product_id: "product-1",
      fact_type: "color",
      fact_value: "Preto",
      confidence: "high",
      source: "specifications",
      extracted_from: null,
      merchant_id: null,
      origin: "backfill",
      validation_status: "unvalidated",
      algorithm_version: "1.0.0",
      created_at: "2026-07-16T00:00:00Z",
      updated_at: "2026-07-16T00:00:00Z",
    };
    const domain = LearnedFactMapper.toDomain(row);
    expect(domain.extractedFrom).toBeNull();
    expect(domain.merchantId).toBeNull();
  });

  it("maps a LearnedFactInput to a DB row (camelCase to snake_case)", () => {
    const row = LearnedFactMapper.toRow({
      canonicalProductId: "product-1",
      factType: FactType.ManufacturerCode,
      factValue: "A3257",
      confidence: "medium",
      source: "name",
      extractedFrom: "candidates: [A3257]",
      merchantId: "store-1",
      origin: "backfill",
      algorithmVersion: "1.0.0",
    });

    expect(row).toMatchObject({
      canonical_product_id: "product-1",
      fact_type: "manufacturer_code",
      fact_value: "A3257",
      confidence: "medium",
      source: "name",
      extracted_from: "candidates: [A3257]",
      merchant_id: "store-1",
      origin: "backfill",
      algorithm_version: "1.0.0",
    });
    expect(typeof row.updated_at).toBe("string");
  });
});
