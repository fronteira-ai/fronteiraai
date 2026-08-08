import { buildSpecificationEntries } from "../services/ProductSpecificationsComposer";
import { FactType } from "@/src/domains/marketplace-memory";
import type { LearnedFact } from "@/src/domains/marketplace-memory";

function makeFact(overrides: Partial<LearnedFact> = {}): LearnedFact {
  return {
    id: "fact-1",
    canonicalProductId: "canonical-1",
    factType: FactType.Color,
    factValue: "Preto",
    confidence: "high",
    source: "specifications",
    extractedFrom: null,
    merchantId: "store-1",
    origin: "backfill",
    validationStatus: "unvalidated",
    algorithmVersion: "1.0.0",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("buildSpecificationEntries", () => {
  it("returns [] when there is neither raw specifications nor learned facts", () => {
    expect(buildSpecificationEntries(null, [])).toEqual([]);
  });

  it("standardizes raw spec labels to title case", () => {
    const entries = buildSpecificationEntries({ "cor da tampa": "Azul" }, []);
    expect(entries).toEqual([{ label: "Cor Da Tampa", value: "Azul", highlight: false, source: "raw" }]);
  });

  it("adds learned facts with a friendly label, unit suffix, and highlight flag", () => {
    const facts = [
      makeFact({ factType: FactType.CapacityGb, factValue: "256" }),
      makeFact({ factType: FactType.RamGb, factValue: "8" }),
      makeFact({ factType: FactType.ManufacturerCode, factValue: "A3257" }),
    ];

    const entries = buildSpecificationEntries(null, facts);

    expect(entries).toEqual([
      { label: "Armazenamento", value: "256 GB", highlight: true, source: "learned" },
      { label: "Memória RAM", value: "8 GB", highlight: true, source: "learned" },
      { label: "Código do fabricante", value: "A3257", highlight: false, source: "learned" },
    ]);
  });

  it("orders learned facts by decision-relevance, not by input order", () => {
    const facts = [
      makeFact({ factType: FactType.Ean, factValue: "789" }),
      makeFact({ factType: FactType.Color, factValue: "Preto" }),
    ];

    const entries = buildSpecificationEntries(null, facts);

    expect(entries.map((e) => e.label)).toEqual(["Cor", "Código EAN (GTIN)"]);
  });

  it("never shows a learned fact that duplicates a raw spec the merchant already provided", () => {
    const facts = [makeFact({ factType: FactType.Color, factValue: "Preto" })];
    const entries = buildSpecificationEntries({ Cor: "Grafite" }, facts);

    expect(entries).toEqual([{ label: "Cor", value: "Grafite", highlight: false, source: "raw" }]);
  });

  it("keeps raw specifications the merchant provided even when no fact type matches them", () => {
    const entries = buildSpecificationEntries({ Garantia: "12 meses" }, [makeFact({ factType: FactType.RamGb, factValue: "8" })]);

    expect(entries).toEqual([
      { label: "Memória RAM", value: "8 GB", highlight: true, source: "learned" },
      { label: "Garantia", value: "12 meses", highlight: false, source: "raw" },
    ]);
  });
});
