import { buildCatalogIntelligence } from "../services/CatalogIntelligenceService";
import { CatalogIssueType, InsightSeverity } from "../types/enums";

type OfferOverrides = {
  image_url?: string | null;
  category_id?: string | null;
  brand_id?: string | null;
  description?: string | null;
  price_usd?: number;
  in_stock?: boolean;
};

function makeOffer(overrides: OfferOverrides = {}) {
  return {
    id: Math.random().toString(),
    in_stock: "in_stock" in overrides ? overrides.in_stock : true,
    price_usd: "price_usd" in overrides ? overrides.price_usd : 100,
    products: {
      id: Math.random().toString(),
      image_url: "image_url" in overrides ? overrides.image_url : "https://img.example.com/p.jpg",
      category_id: "category_id" in overrides ? overrides.category_id : "cat-1",
      brand_id: "brand_id" in overrides ? overrides.brand_id : "brand-1",
      description: "description" in overrides ? overrides.description : "Produto top",
    },
  };
}

// ── Stub the DB calls so tests run without Supabase ──────────────────────────

function mockClient(offers: ReturnType<typeof makeOffer>[], logDays = 3) {
  const lastImportAt = new Date(Date.now() - logDays * 86400000).toISOString();
  return {
    from: jest.fn().mockImplementation((table: string) => {
      if (table === "offers") {
        return {
          select: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: offers, error: null }),
          }),
        };
      }
      if (table === "import_logs") {
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ created_at: lastImportAt, success: true }], error: null }),
            }),
          }),
        };
      }
      return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: [], error: null }) }) };
    }),
  } as unknown as import("@supabase/supabase-js").SupabaseClient;
}

describe("buildCatalogIntelligence", () => {
  it("returns empty result when no stores", async () => {
    const result = await buildCatalogIntelligence("m1", [], {} as never);
    expect(result.totalProducts).toBe(0);
    expect(result.issues[0].type).toBe(CatalogIssueType.NoProducts);
  });

  it("detects no-image issue", async () => {
    const offers = [
      makeOffer({ image_url: null }),
      makeOffer({ image_url: null }),
      makeOffer(),
    ];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers));
    const issue = result.issues.find((i) => i.type === CatalogIssueType.NoImage);
    expect(issue).toBeDefined();
    expect(issue!.count).toBe(2);
  });

  it("detects no-price issue", async () => {
    const offers = [makeOffer({ price_usd: 0 }), makeOffer()];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers));
    const issue = result.issues.find((i) => i.type === CatalogIssueType.NoPrice);
    expect(issue).toBeDefined();
    expect(issue!.count).toBe(1);
  });

  it("detects no-category issue", async () => {
    const offers = [makeOffer({ category_id: null })];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers));
    const issue = result.issues.find((i) => i.type === CatalogIssueType.NoCategory);
    expect(issue).toBeDefined();
  });

  it("detects no-brand issue", async () => {
    const offers = [makeOffer({ brand_id: null })];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers));
    const issue = result.issues.find((i) => i.type === CatalogIssueType.NoBrand);
    expect(issue).toBeDefined();
  });

  it("computes healthScore 100 for perfect catalog", async () => {
    const offers = [makeOffer(), makeOffer(), makeOffer()];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers, 2));
    expect(result.healthScore).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it("sorts critical issues first", async () => {
    const offers = [
      makeOffer({ price_usd: 0 }),
      makeOffer({ image_url: null }),
      makeOffer({ brand_id: null }),
    ];
    const result = await buildCatalogIntelligence("m1", ["s1"], mockClient(offers));
    if (result.issues.length >= 2) {
      const severities = result.issues.map((i) => i.severity);
      const order = [InsightSeverity.Critical, InsightSeverity.Warning, InsightSeverity.Info];
      for (let i = 1; i < severities.length; i++) {
        expect(order.indexOf(severities[i])).toBeGreaterThanOrEqual(order.indexOf(severities[i - 1]));
      }
    }
  });

  it("flags stale import after 14 days", async () => {
    const offers = [makeOffer()];
    const staleClient = {
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "offers") {
          return { select: jest.fn().mockReturnValue({ in: jest.fn().mockResolvedValue({ data: offers, error: null }) }) };
        }
        const staleDate = new Date(Date.now() - 20 * 86400000).toISOString();
        return {
          select: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ data: [{ created_at: staleDate, success: true }], error: null }),
            }),
          }),
        };
      }),
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const result = await buildCatalogIntelligence("m1", ["s1"], staleClient);
    const stale = result.issues.find((i) => i.type === CatalogIssueType.StaleImport);
    expect(stale).toBeDefined();
  });
});
