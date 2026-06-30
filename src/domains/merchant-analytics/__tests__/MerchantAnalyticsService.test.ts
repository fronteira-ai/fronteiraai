import { MerchantAnalyticsService } from "../services/MerchantAnalyticsService";
import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import { AnalyticsEventType, AnalyticsWindow } from "../types/enums";
import type { StoredAnalyticsEvent } from "../types/analytics.types";

function makeEventRepo(events: Partial<StoredAnalyticsEvent>[] = []): jest.Mocked<IAnalyticsEventRepository> {
  const full = events.map((e, i): StoredAnalyticsEvent => ({
    id: `evt-${i}`,
    event_type: AnalyticsEventType.ProductImpression,
    session_id: null,
    buyer_id: null,
    anonymous_id: `anon-${i}`,
    merchant_id: "merch-1",
    store_id: null,
    product_id: null,
    search_query: null,
    page_url: "https://paraguai.com",
    referrer: null,
    metadata: {},
    occurred_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...e,
  }));

  return {
    insert: jest.fn(),
    insertBatch: jest.fn(),
    countByType: jest.fn().mockResolvedValue(0),
    findBySession: jest.fn().mockResolvedValue([]),
    findByMerchant: jest.fn().mockResolvedValue(full),
    findByProduct: jest.fn().mockResolvedValue([]),
    countRecent: jest.fn().mockResolvedValue(0),
  };
}

describe("MerchantAnalyticsService", () => {
  describe("getSummary", () => {
    it("counts views correctly", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.MerchantViewed, anonymous_id: "a1" },
        { event_type: AnalyticsEventType.MerchantViewed, anonymous_id: "a2" },
        { event_type: AnalyticsEventType.MerchantPassportViewed, anonymous_id: "a3" },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getSummary("merch-1", AnalyticsWindow.Last7Days);
      expect(result.views).toBe(3);
      expect(result.unique_visitors).toBe(3);
    });

    it("counts unique visitors (same anon_id counted once)", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.MerchantViewed, anonymous_id: "same" },
        { event_type: AnalyticsEventType.ProductClicked, anonymous_id: "same" },
        { event_type: AnalyticsEventType.MerchantViewed, anonymous_id: "other" },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getSummary("merch-1", AnalyticsWindow.Last7Days);
      expect(result.unique_visitors).toBe(2);
    });

    it("computes CTR correctly", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.ProductImpression },
        { event_type: AnalyticsEventType.ProductImpression },
        { event_type: AnalyticsEventType.ProductImpression },
        { event_type: AnalyticsEventType.ProductImpression },
        { event_type: AnalyticsEventType.ProductClicked },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getSummary("merch-1", AnalyticsWindow.Last7Days);
      expect(result.product_impressions).toBe(4);
      expect(result.product_clicks).toBe(1);
      expect(result.ctr).toBe(25);
    });

    it("counts whatsapp clicks in both whatsapp_clicks and contact_clicks", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.MerchantWhatsAppClicked },
        { event_type: AnalyticsEventType.MerchantPhoneClicked },
        { event_type: AnalyticsEventType.MerchantContactClicked },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getSummary("merch-1", AnalyticsWindow.Last7Days);
      expect(result.whatsapp_clicks).toBe(1);
      expect(result.phone_clicks).toBe(1);
      // WhatsApp and Phone also counted as contact
      expect(result.contact_clicks).toBe(3);
    });

    it("returns zero CTR when no impressions", async () => {
      const repo = makeEventRepo([]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getSummary("merch-1", AnalyticsWindow.Last7Days);
      expect(result.ctr).toBe(0);
    });
  });

  describe("getProductAnalytics", () => {
    it("aggregates impressions, clicks, saves per product", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p1" },
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p1" },
        { event_type: AnalyticsEventType.ProductClicked, product_id: "p1" },
        { event_type: AnalyticsEventType.OfferSaved, product_id: "p1" },
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p2" },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getProductAnalytics("merch-1", AnalyticsWindow.Last7Days);
      const p1 = result.products.find((p) => p.product_id === "p1")!;
      expect(p1.impressions).toBe(2);
      expect(p1.clicks).toBe(1);
      expect(p1.saves).toBe(1);
      expect(p1.ctr).toBe(50);
      expect(result.total_analyzed).toBe(2);
    });

    it("sorts products by impressions descending", async () => {
      const repo = makeEventRepo([
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p2" },
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p1" },
        { event_type: AnalyticsEventType.ProductImpression, product_id: "p1" },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getProductAnalytics("merch-1", AnalyticsWindow.Last7Days);
      expect(result.products[0].product_id).toBe("p1");
    });
  });

  describe("getTrafficAnalytics", () => {
    it("classifies traffic sources correctly", async () => {
      const repo = makeEventRepo([
        { referrer: "https://google.com/search", event_type: AnalyticsEventType.MerchantViewed },
        { referrer: "https://google.com/search", event_type: AnalyticsEventType.MerchantViewed },
        { referrer: null, event_type: AnalyticsEventType.MerchantViewed },
        { referrer: "https://facebook.com/", event_type: AnalyticsEventType.MerchantViewed },
      ]);
      const svc = new MerchantAnalyticsService(repo);
      const result = await svc.getTrafficAnalytics("merch-1", AnalyticsWindow.Last7Days);
      const google = result.sources.find((s) => s.source === "Google")!;
      const direto = result.sources.find((s) => s.source === "Direto")!;
      expect(google.visits).toBe(2);
      expect(direto.visits).toBe(1);
      expect(result.total_visits).toBe(4);
    });
  });
});
