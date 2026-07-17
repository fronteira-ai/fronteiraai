import { MerchantAttributePatternMapper } from "../mappers/MerchantAttributePatternMapper";

describe("MerchantAttributePatternMapper", () => {
  it("maps a DB row to the domain entity", () => {
    const row = {
      id: "pattern-1",
      store_id: "store-1",
      raw_key: "MODELO",
      concept: "model",
      confidence: "medium",
      occurrences: 3,
      algorithm_version: "1.0.0",
      validation_status: "unvalidated",
      created_at: "2026-07-16T00:00:00Z",
      updated_at: "2026-07-16T00:00:00Z",
    };

    expect(MerchantAttributePatternMapper.toDomain(row)).toEqual({
      id: "pattern-1",
      storeId: "store-1",
      rawKey: "MODELO",
      concept: "model",
      confidence: "medium",
      occurrences: 3,
      algorithmVersion: "1.0.0",
      validationStatus: "unvalidated",
      createdAt: "2026-07-16T00:00:00Z",
      updatedAt: "2026-07-16T00:00:00Z",
    });
  });

  it("maps an input + occurrences count to a DB row", () => {
    const row = MerchantAttributePatternMapper.toRow(
      { storeId: "store-1", rawKey: "MODELO", concept: "model", confidence: "medium", algorithmVersion: "1.0.0" },
      3
    );
    expect(row).toMatchObject({
      store_id: "store-1",
      raw_key: "MODELO",
      concept: "model",
      confidence: "medium",
      occurrences: 3,
      algorithm_version: "1.0.0",
    });
  });
});
