import { OpportunityDetector } from "../services/OpportunityDetector";
import { OpportunityType, ImpactLevel } from "../types/enums";
import { makeContext, makeAnalytics, makeCatalog, makeSummary, makeProducts } from "./helpers";

describe("OpportunityDetector", () => {
  let detector: OpportunityDetector;

  beforeEach(() => {
    detector = new OpportunityDetector();
  });

  it("returns empty array when context has no signals", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({
        views: 5,
        contact_clicks: 2,
        product_impressions: 10,
        offer_saves: 1,
      }),
      products: makeProducts({ products: [] }),
      catalog: makeCatalog({ healthScore: 90 }),
    });
    const opps = detector.detect(ctx);
    expect(opps).toEqual([]);
  });

  it("detects HighViewsLowContact when views >= 30 and contact_clicks = 0", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({ views: 50, contact_clicks: 0 }),
    });
    const opps = detector.detect(ctx);
    const opp = opps.find((o) => o.type === OpportunityType.HighViewsLowContact);
    expect(opp).toBeDefined();
    expect(opp?.impact).toBe(ImpactLevel.High);
    expect(opp?.evidence.some((e) => e.label === "Visitas")).toBe(true);
  });

  it("does not detect HighViewsLowContact when contacts > 0", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({ views: 50, contact_clicks: 5 }),
    });
    const opps = detector.detect(ctx);
    expect(opps.find((o) => o.type === OpportunityType.HighViewsLowContact)).toBeUndefined();
  });

  it("detects NeverClickedProduct for products with impressions but 0 clicks", () => {
    const ctx = makeContext({
      products: makeProducts({
        products: [
          { product_id: "p1", product_name: "Produto A", impressions: 20, clicks: 0, saves: 0, ctr: 0 },
          { product_id: "p2", product_name: "Produto B", impressions: 5, clicks: 1, saves: 0, ctr: 20 },
        ],
        total_analyzed: 2,
      }),
    });
    const opps = detector.detect(ctx);
    const opp = opps.find((o) => o.type === OpportunityType.NeverClickedProduct);
    expect(opp).toBeDefined();
    expect(opp?.product_id).toBe("p1");
  });

  it("detects LowSavesHighImpressions when impressions >= 100 and saves = 0", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({ product_impressions: 120, offer_saves: 0 }),
    });
    const opps = detector.detect(ctx);
    const opp = opps.find((o) => o.type === OpportunityType.LowSavesHighImpressions);
    expect(opp).toBeDefined();
    expect(opp?.impact).toBe(ImpactLevel.Medium);
  });

  it("detects catalog health opportunity when score < 50 and products > 0", () => {
    const ctx = makeContext({
      catalog: makeCatalog({ healthScore: 25, issues: [{ type: "missing_images" as never, severity: "critical" as never, label: "Sem imagem", count: 5, total: 10, percentage: 50, description: "", impact: "", actionHref: "", actionLabel: "" }] }),
      summary: makeSummary({ totalProducts: 10 }),
    });
    const opps = detector.detect(ctx);
    const opp = opps.find((o) => o.type === OpportunityType.UnderExposedProduct);
    expect(opp).toBeDefined();
    expect(opp?.impact).toBe(ImpactLevel.High);
  });

  it("each opportunity has required fields and at least one evidence entry", () => {
    const ctx = makeContext({
      analytics: makeAnalytics({ views: 50, contact_clicks: 0, product_impressions: 150, offer_saves: 0 }),
    });
    const opps = detector.detect(ctx);
    opps.forEach((o) => {
      expect(typeof o.id).toBe("string");
      expect(typeof o.title).toBe("string");
      expect(typeof o.detected_at).toBe("string");
      expect(o.evidence.length).toBeGreaterThan(0);
    });
  });
});
