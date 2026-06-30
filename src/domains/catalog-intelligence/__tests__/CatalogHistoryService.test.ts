import { CatalogHistoryService } from "../services/CatalogHistoryService";
import type { ICatalogSnapshotRepository } from "../repositories/ICatalogSnapshotRepository";
import type { CatalogHealthBreakdown, CatalogHealthSnapshot } from "../types/catalog-intelligence.types";

function makeSnapshot(date: string, score: number): CatalogHealthSnapshot {
  return {
    snapshot_date: date,
    health_score: score,
    products_ideal: 10,
    products_attention: 3,
    products_critical: 2,
    total_products: 15,
  };
}

function makeBreakdown(override: Partial<CatalogHealthBreakdown> = {}): CatalogHealthBreakdown {
  return {
    ideal_count: 10,
    attention_count: 3,
    critical_count: 2,
    total: 15,
    ideal_pct: 67,
    attention_pct: 20,
    critical_pct: 13,
    health_score: 75,
    ...override,
  };
}

class MockRepo implements ICatalogSnapshotRepository {
  public savedCalls: { merchantId: string; healthScore: number; breakdown: CatalogHealthBreakdown }[] = [];
  private snapshots: CatalogHealthSnapshot[];

  constructor(snapshots: CatalogHealthSnapshot[] = []) {
    this.snapshots = snapshots;
  }

  async getHistory(_merchantId: string, days: number): Promise<CatalogHealthSnapshot[]> {
    return this.snapshots.slice(0, days);
  }

  async saveSnapshot(merchantId: string, healthScore: number, breakdown: CatalogHealthBreakdown): Promise<void> {
    this.savedCalls.push({ merchantId, healthScore, breakdown });
  }
}

describe("CatalogHistoryService", () => {
  it("returns empty history with stable trend when no snapshots", async () => {
    const svc = new CatalogHistoryService(new MockRepo([]));
    const history = await svc.getHistory("merchant-1");
    expect(history.snapshots).toHaveLength(0);
    expect(history.trend).toBe("stable");
    expect(history.merchant_id).toBe("merchant-1");
  });

  it("returns stable trend with only one snapshot", async () => {
    const svc = new CatalogHistoryService(new MockRepo([makeSnapshot("2026-06-30", 70)]));
    const history = await svc.getHistory("merchant-1");
    expect(history.trend).toBe("stable");
  });

  it("detects improving trend when delta >= 5", async () => {
    const snapshots = [
      makeSnapshot("2026-06-30", 80), // newest
      makeSnapshot("2026-06-01", 70), // oldest
    ];
    const svc = new CatalogHistoryService(new MockRepo(snapshots));
    const history = await svc.getHistory("merchant-1");
    expect(history.trend).toBe("improving");
  });

  it("detects declining trend when delta <= -5", async () => {
    const snapshots = [
      makeSnapshot("2026-06-30", 60), // newest
      makeSnapshot("2026-06-01", 75), // oldest
    ];
    const svc = new CatalogHistoryService(new MockRepo(snapshots));
    const history = await svc.getHistory("merchant-1");
    expect(history.trend).toBe("declining");
  });

  it("is stable when delta is between -4 and 4", async () => {
    const snapshots = [
      makeSnapshot("2026-06-30", 73),
      makeSnapshot("2026-06-01", 70),
    ];
    const svc = new CatalogHistoryService(new MockRepo(snapshots));
    const history = await svc.getHistory("merchant-1");
    expect(history.trend).toBe("stable");
  });

  it("respects days limit from repository", async () => {
    const snapshots = Array.from({ length: 30 }, (_, i) =>
      makeSnapshot(`2026-06-${String(30 - i).padStart(2, "0")}`, 80 - i)
    );
    const repo = new MockRepo(snapshots);
    const svc = new CatalogHistoryService(repo);
    const history = await svc.getHistory("merchant-1", 7);
    expect(history.snapshots.length).toBeLessThanOrEqual(7);
  });

  it("recordSnapshot calls repository with correct data", async () => {
    const repo = new MockRepo();
    const svc = new CatalogHistoryService(repo);
    const breakdown = makeBreakdown({ health_score: 75 });
    await svc.recordSnapshot("merchant-1", breakdown);
    expect(repo.savedCalls).toHaveLength(1);
    expect(repo.savedCalls[0].merchantId).toBe("merchant-1");
    expect(repo.savedCalls[0].healthScore).toBe(75);
    expect(repo.savedCalls[0].breakdown).toEqual(breakdown);
  });

  it("includes generated_at timestamp in response", async () => {
    const svc = new CatalogHistoryService(new MockRepo());
    const before = Date.now();
    const history = await svc.getHistory("merchant-1");
    const after = Date.now();
    const ts = new Date(history.generated_at).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
