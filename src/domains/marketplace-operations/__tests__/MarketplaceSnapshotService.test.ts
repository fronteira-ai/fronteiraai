import { MarketplaceSnapshotService } from "../services/MarketplaceSnapshotService";
import { MarketplaceHealthFactor, MarketplaceHealthStatus } from "../types/enums";
import type { IMarketplaceSnapshotRepository } from "../repositories/IMarketplaceSnapshotRepository";
import type { FactorScore, MarketplaceHealthBreakdown, MarketplaceHealthSnapshot } from "../types/health.types";
import type { MarketplaceMetricsSnapshot } from "../types/metrics.types";

class FakeSnapshotRepository implements IMarketplaceSnapshotRepository {
  public saved: { overallScore: number; factorBreakdown: FactorScore[]; metrics: Record<string, unknown> }[] = [];
  public history: MarketplaceHealthSnapshot[] = [];
  public latest: MarketplaceHealthSnapshot | null = null;

  async getHistory(days: number) {
    return this.history.slice(0, days);
  }

  async getLatest() {
    return this.latest;
  }

  async saveSnapshot(overallScore: number, factorBreakdown: FactorScore[], metrics: Record<string, unknown>) {
    this.saved.push({ overallScore, factorBreakdown, metrics });
  }
}

function makeHealth(overallScore: number): MarketplaceHealthBreakdown {
  return {
    overallScore,
    status: MarketplaceHealthStatus.Attention,
    generatedAt: new Date().toISOString(),
    factors: [{ factor: MarketplaceHealthFactor.Coverage, weight: 15, score: 80, weightedScore: 12, detail: "" }],
  };
}

function makeMetrics(): MarketplaceMetricsSnapshot {
  return {
    stores: 10,
    products: 100,
    offers: 200,
    canonicalProducts: 50,
    brands: 20,
    categories: 15,
    coveragePct: 60,
    syncsPerHour: 5,
    priceUpdatesPerHour: 3,
    claimRate: 40,
    buyerSessions: 30,
    buyerEvents: 90,
    brainEvents: 10,
    knowledgeRelations: null,
    generatedAt: new Date().toISOString(),
  };
}

describe("MarketplaceSnapshotService", () => {
  it("persists the health score and factor breakdown via the repository", async () => {
    const repo = new FakeSnapshotRepository();
    const service = new MarketplaceSnapshotService(repo);

    await service.recordDaily(makeHealth(72), makeMetrics());

    expect(repo.saved).toHaveLength(1);
    expect(repo.saved[0].overallScore).toBe(72);
    expect(repo.saved[0].factorBreakdown).toHaveLength(1);
  });

  it("returns history from the repository", async () => {
    const repo = new FakeSnapshotRepository();
    repo.history = [
      { snapshotDate: "2026-07-01", overallScore: 60, factorBreakdown: [], metrics: {} },
      { snapshotDate: "2026-07-02", overallScore: 65, factorBreakdown: [], metrics: {} },
    ];
    const service = new MarketplaceSnapshotService(repo);

    const history = await service.getHistory(1);
    expect(history).toHaveLength(1);
  });

  it("returns null previous score when no snapshot exists yet", async () => {
    const repo = new FakeSnapshotRepository();
    const service = new MarketplaceSnapshotService(repo);
    expect(await service.getPreviousScore()).toBeNull();
  });

  it("returns the latest snapshot's overallScore as the previous score", async () => {
    const repo = new FakeSnapshotRepository();
    repo.latest = { snapshotDate: "2026-07-02", overallScore: 88, factorBreakdown: [], metrics: {} };
    const service = new MarketplaceSnapshotService(repo);
    expect(await service.getPreviousScore()).toBe(88);
  });
});
