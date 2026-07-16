import { buildProductSignature } from "../extraction/ProductSignatureExtractor";
import type { ExtractableProduct } from "../extraction/ProductSignatureExtractor";

describe("buildProductSignature", () => {
  it("builds a full signature from real specification keys and a real product name", () => {
    const product: ExtractableProduct = {
      id: "canonical-1",
      name: "Apple iPhone 17 Pro Max A3257 eSIM 1TB",
      brandName: "Apple",
      specifications: {
        COR: "Titânio Preto",
        "MEMÓRIA INTERNA": "1TB",
        "MEMÓRIA RAM": "12GB",
        VOLTAGEM: "220V",
        TELA: "6.9\"",
      },
    };

    const sig = buildProductSignature(product);

    expect(sig.brand).toEqual({ value: "Apple", source: "brand_id", confidence: "high", extractedFrom: "brands.name (FK, already resolved)" });
    expect(sig.color.value).toBe("TITANIO_PRETO");
    expect(sig.color.source).toBe("specifications");
    expect(sig.color.confidence).toBe("high");
    expect(sig.color.extractedFrom).toBe('COR="Titânio Preto"');
    expect(sig.capacityGb.value).toBe(1024);
    expect(sig.ramGb.value).toBe(12);
    expect(sig.voltage.value).toBe("220V");
    expect(sig.screenSizeIn.value).toBe(6.9);
    expect(sig.model.value).toBe("IPHONE_17_PRO_MAX");
    expect(sig.model.source).toBe("name");
    expect(sig.model.confidence).toBe("medium");
    expect(sig.manufacturerCode.value).toBe("A3257");
  });

  it("resolves key aliases across casing/language variants (COR vs Color)", () => {
    const a = buildProductSignature({ id: "a", name: "X", brandName: null, specifications: { COR: "Preto" } });
    const b = buildProductSignature({ id: "b", name: "X", brandName: null, specifications: { Color: "Preto" } });
    expect(a.color.value).toBe(b.color.value);
    expect(a.color.value).toBe("PRETO");
  });

  it("never fabricates a value — every field stays null when there is nothing to extract", () => {
    const sig = buildProductSignature({ id: "empty", name: "Produto Genérico", brandName: null, specifications: {} });
    expect(sig.brand).toEqual({ value: null, source: null, confidence: null, extractedFrom: null });
    expect(sig.color.value).toBeNull();
    expect(sig.capacityGb.value).toBeNull();
    expect(sig.model.value).toBeNull();
    expect(sig.manufacturerCode.value).toBeNull();
  });

  it("handles a null specifications object without throwing", () => {
    const sig = buildProductSignature({ id: "null-spec", name: "Produto", brandName: "Marca", specifications: null });
    expect(sig.color.value).toBeNull();
    expect(sig.brand.value).toBe("Marca");
  });
});
