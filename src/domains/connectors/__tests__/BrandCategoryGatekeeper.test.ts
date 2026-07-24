import { resolveBrand, resolveCategory } from "../normalization/BrandCategoryGatekeeper";
import type { GatekeeperDependencies, ExistingCatalogEntry } from "../normalization/BrandCategoryGatekeeper";

function makeDeps(overrides: Partial<GatekeeperDependencies> = {}): GatekeeperDependencies {
  return {
    findBrandByNormalizedName: jest.fn().mockResolvedValue(null),
    findCategoryByNormalizedName: jest.fn().mockResolvedValue(null),
    findBrandIdByIdentifier: jest.fn().mockResolvedValue(null),
    findLearnedCorrection: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe("BrandCategoryGatekeeper.resolveBrand", () => {
  it("Mission Ω-Gatekeeper: never accepts a forbidden placeholder value ('Outros', 'GENERAL', etc)", async () => {
    const deps = makeDeps();
    for (const junk of ["Outros", "GENERAL", "Geral", "SEM MARCA", "GENERICO", "Diversos", "unknown", "N/A", ""]) {
      const result = await resolveBrand({ rawBrandName: junk, storeId: "store-1", productName: "Some Product", specifications: null }, deps);
      expect(result.decision).toBe("pending_review");
    }
  });

  it("accepts a well-formed, never-before-seen brand name as new — preserving its original casing", async () => {
    const deps = makeDeps();
    const result = await resolveBrand({ rawBrandName: "Oukitel", storeId: "store-1", productName: "Celular Oukitel C65", specifications: null }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Oukitel", matchedLayer: "new" }));
  });

  it("reuses an existing brand when the raw text normalizes to the same identity (case/corporate-suffix insensitive)", async () => {
    const existing: ExistingCatalogEntry = { id: "brand-1", name: "Apple" };
    const deps = makeDeps({ findBrandByNormalizedName: jest.fn().mockResolvedValue(existing) });
    const result = await resolveBrand({ rawBrandName: "APPLE INC.", storeId: "store-1", productName: "iPhone 17 Pro", specifications: null }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Apple", matchedLayer: "existing" }));
  });

  it("never treats a single generic/common-noun token as a confirmed brand", async () => {
    const deps = makeDeps();
    const result = await resolveBrand({ rawBrandName: "Camara", storeId: "store-1", productName: "Camara de Accion X5", specifications: null }, deps);
    expect(result.decision).toBe("pending_review");
    if (result.decision === "pending_review") {
      expect(result.reasons.join(" ")).toMatch(/generic token/);
    }
  });

  it("goes to pending_review with real reasons when brand text is entirely absent and nothing else confirms it", async () => {
    const deps = makeDeps();
    const result = await resolveBrand({ rawBrandName: undefined, storeId: "store-1", productName: "Perfume Sem Marca 100ml", specifications: null }, deps);
    expect(result.decision).toBe("pending_review");
    if (result.decision === "pending_review") {
      expect(result.reasons.length).toBeGreaterThan(0);
    }
  });

  it("Camada 1 — a confirmed EAN already on file for another product resolves brand even with no brand text at all", async () => {
    const deps = makeDeps({
      findBrandIdByIdentifier: jest.fn().mockImplementation(async (type: string, value: string) =>
        type === "ean" && value === "7891234567890" ? { id: "brand-1", name: "Apple" } : null
      ),
    });
    const result = await resolveBrand(
      { rawBrandName: undefined, storeId: "store-1", productName: "iPhone 17 Pro", specifications: { "Código de barras": "7891234567890" } },
      deps
    );
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Apple", matchedLayer: "identifier" }));
  });

  it("Camada 1 result is itself rejected if the matched brand is forbidden/generic (never propagate junk)", async () => {
    const deps = makeDeps({
      findBrandIdByIdentifier: jest.fn().mockResolvedValue({ id: "brand-junk", name: "Outros" }),
    });
    const result = await resolveBrand(
      { rawBrandName: undefined, storeId: "store-1", productName: "iPhone 17 Pro", specifications: { "Código de barras": "7891234567890" } },
      deps
    );
    expect(result.decision).toBe("pending_review");
  });

  it("Camada 5 (aprendizado) — reuses a previously learned human correction for this exact store+raw value", async () => {
    const deps = makeDeps({
      findLearnedCorrection: jest.fn().mockImplementation(async (storeId: string, rawValue: string, concept: string) =>
        storeId === "store-1" && rawValue === "Apple Inc" && concept === "brand" ? "Apple" : null
      ),
    });
    const result = await resolveBrand({ rawBrandName: "Apple Inc", storeId: "store-1", productName: "iPhone", specifications: null }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Apple", matchedLayer: "learned-pattern" }));
  });

  it("a learned correction scoped to a DIFFERENT store never applies", async () => {
    const deps = makeDeps({
      findLearnedCorrection: jest.fn().mockImplementation(async (storeId: string) => (storeId === "store-2" ? "Apple" : null)),
    });
    const result = await resolveBrand({ rawBrandName: "Apple Inc", storeId: "store-1", productName: "iPhone", specifications: null }, deps);
    // Falls through to normalization instead — "Apple Inc" normalizes fine on its own.
    expect(result).toEqual(expect.objectContaining({ decision: "accept" }));
  });
});

describe("BrandCategoryGatekeeper.resolveCategory", () => {
  it("never accepts a forbidden placeholder category ('GENERAL', 'Outros', etc)", async () => {
    const deps = makeDeps();
    for (const junk of ["GENERAL", "Geral", "Outros", "Diversos", ""]) {
      const result = await resolveCategory({ rawCategoryName: junk, storeId: "store-1" }, deps);
      expect(result.decision).toBe("pending_review");
    }
  });

  it("accepts a well-formed, never-before-seen category as new", async () => {
    const deps = makeDeps();
    const result = await resolveCategory({ rawCategoryName: "Bicicletas Elétricas", storeId: "store-1" }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", matchedLayer: "new" }));
  });

  it("reuses an existing category via the Universal Taxonomy / synonym table (e.g. 'smartphones' -> 'Celulares e Smartphones')", async () => {
    const existing: ExistingCatalogEntry = { id: "cat-1", name: "Celulares e Smartphones" };
    const deps = makeDeps({ findCategoryByNormalizedName: jest.fn().mockResolvedValue(existing) });
    const result = await resolveCategory({ rawCategoryName: "smartphones", storeId: "store-1" }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Celulares e Smartphones", matchedLayer: "existing" }));
  });

  it("reuses a learned store-specific correction (e.g. 'Notebook Gamer' -> 'Notebook')", async () => {
    const deps = makeDeps({
      findLearnedCorrection: jest.fn().mockImplementation(async (storeId: string, rawValue: string, concept: string) =>
        storeId === "store-1" && rawValue === "Notebook Gamer" && concept === "category" ? "Notebook" : null
      ),
    });
    const result = await resolveCategory({ rawCategoryName: "Notebook Gamer", storeId: "store-1" }, deps);
    expect(result).toEqual(expect.objectContaining({ decision: "accept", value: "Notebook", matchedLayer: "learned-pattern" }));
  });
});
