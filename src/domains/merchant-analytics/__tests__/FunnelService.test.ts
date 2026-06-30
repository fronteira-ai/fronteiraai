import { FunnelService } from "../services/FunnelService";
import type { IAnalyticsEventRepository } from "../repositories/IAnalyticsEventRepository";
import { AnalyticsEventType, AnalyticsWindow, FunnelStep } from "../types/enums";

function makeEventRepo(countsByType: Partial<Record<AnalyticsEventType, number>> = {}): jest.Mocked<IAnalyticsEventRepository> {
  return {
    insert: jest.fn(),
    insertBatch: jest.fn(),
    countByType: jest.fn().mockImplementation(async (eventType: AnalyticsEventType) => {
      return countsByType[eventType] ?? 0;
    }),
    findBySession: jest.fn().mockResolvedValue([]),
    findByMerchant: jest.fn().mockResolvedValue([]),
    findByProduct: jest.fn().mockResolvedValue([]),
    countRecent: jest.fn().mockResolvedValue(0),
  };
}

describe("FunnelService", () => {
  describe("getFunnel", () => {
    it("returns all funnel steps in order", async () => {
      const repo = makeEventRepo({
        [AnalyticsEventType.SearchPerformed]: 100,
        [AnalyticsEventType.ProductImpression]: 80,
        [AnalyticsEventType.ProductClicked]: 40,
        [AnalyticsEventType.MerchantViewed]: 20,
        [AnalyticsEventType.MerchantContactClicked]: 10,
        [AnalyticsEventType.OfferSaved]: 5,
      });
      const svc = new FunnelService(repo);
      const result = await svc.getFunnel(AnalyticsWindow.Last7Days);

      expect(result.steps).toHaveLength(6);
      expect(result.steps[0].step).toBe(FunnelStep.Search);
      expect(result.steps[0].count).toBe(100);
      expect(result.steps[5].step).toBe(FunnelStep.Save);
      expect(result.steps[5].count).toBe(5);
    });

    it("computes drop rate between steps", async () => {
      const repo = makeEventRepo({
        [AnalyticsEventType.SearchPerformed]: 100,
        [AnalyticsEventType.ProductImpression]: 80,
      });
      const svc = new FunnelService(repo);
      const result = await svc.getFunnel(AnalyticsWindow.Last7Days);
      const impression = result.steps[1];
      expect(impression.drop_rate).toBe(20); // 20% drop from 100 to 80
      expect(impression.conversion_rate).toBe(80); // 80% converted
    });

    it("sets null drop_rate for the first step", async () => {
      const repo = makeEventRepo({ [AnalyticsEventType.SearchPerformed]: 50 });
      const svc = new FunnelService(repo);
      const result = await svc.getFunnel(AnalyticsWindow.Last7Days);
      expect(result.steps[0].drop_rate).toBeNull();
      expect(result.steps[0].conversion_rate).toBeNull();
    });

    it("computes overall_conversion as bottom/top ratio", async () => {
      const repo = makeEventRepo({
        [AnalyticsEventType.SearchPerformed]: 200,
        [AnalyticsEventType.OfferSaved]: 4,
      });
      const svc = new FunnelService(repo);
      const result = await svc.getFunnel(AnalyticsWindow.Last7Days);
      expect(result.overall_conversion).toBe(2); // 4/200 = 2%
    });

    it("returns 0% overall_conversion when no searches", async () => {
      const repo = makeEventRepo({});
      const svc = new FunnelService(repo);
      const result = await svc.getFunnel(AnalyticsWindow.Last7Days);
      expect(result.overall_conversion).toBe(0);
    });

    it("passes merchantId to countByType when provided", async () => {
      const repo = makeEventRepo({ [AnalyticsEventType.SearchPerformed]: 10 });
      const svc = new FunnelService(repo);
      await svc.getFunnel(AnalyticsWindow.Last7Days, "merch-123");
      expect(repo.countByType).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Date),
        "merch-123"
      );
    });
  });
});
