import { buildConnectorHealthSummary } from "../services/ConnectorHealthService";
import { ConnectorType, ConnectorStatus, SyncRunStatus } from "../types/enums";
import type { Connector } from "../domain/Connector";
import type { SyncRun } from "../domain/SyncRun";

function makeConnector(overrides: Partial<Connector> = {}): Connector {
  return {
    id: "c1",
    connectorKey: "shoppingchina",
    name: "ShoppingChina",
    version: "1.0.0",
    type: ConnectorType.Crawler,
    storeSlug: "shoppingchina",
    description: null,
    status: ConnectorStatus.Active,
    config: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeRun(overrides: Partial<SyncRun> = {}): SyncRun {
  return {
    id: "r1",
    connectorId: "c1",
    connectorKey: "shoppingchina",
    merchantId: null,
    batchId: "b1",
    dryRun: false,
    status: SyncRunStatus.Success,
    totals: { persisted: 10 },
    errors: null,
    startedAt: "2026-07-01T10:00:00Z",
    completedAt: "2026-07-01T10:01:00Z",
    ...overrides,
  };
}

describe("buildConnectorHealthSummary", () => {
  it("reports 100% uptime and 0 error rate when every sampled run succeeded", () => {
    const connector = makeConnector();
    const runs = [makeRun(), makeRun({ id: "r2" }), makeRun({ id: "r3" })];

    const summary = buildConnectorHealthSummary(connector, runs);

    expect(summary.uptime).toBe(100);
    expect(summary.errorRate).toBe(0);
    expect(summary.failureCount).toBe(0);
    expect(summary.healthScore).toBe(100);
  });

  it("computes uptime and error rate proportionally against the sample size", () => {
    const connector = makeConnector();
    const runs = [
      makeRun({ id: "r1", status: SyncRunStatus.Success }),
      makeRun({ id: "r2", status: SyncRunStatus.Failed, completedAt: null }),
      makeRun({ id: "r3", status: SyncRunStatus.Failed, completedAt: null }),
      makeRun({ id: "r4", status: SyncRunStatus.Success }),
    ];

    const summary = buildConnectorHealthSummary(connector, runs);

    expect(summary.uptime).toBe(50);
    expect(summary.errorRate).toBe(0.5);
    expect(summary.failureCount).toBe(2);
  });

  it("treats an empty sample as 100% uptime (no evidence of failure, not fabricated success)", () => {
    const summary = buildConnectorHealthSummary(makeConnector(), []);

    expect(summary.uptime).toBe(100);
    expect(summary.errorRate).toBe(0);
    expect(summary.avgDurationSeconds).toBeNull();
    expect(summary.importedItems).toBe(0);
  });

  it("averages duration in seconds across completed successful runs only", () => {
    const runs = [
      makeRun({ startedAt: "2026-07-01T10:00:00Z", completedAt: "2026-07-01T10:01:00Z" }), // 60s
      makeRun({ id: "r2", startedAt: "2026-07-01T11:00:00Z", completedAt: "2026-07-01T11:02:00Z" }), // 120s
      makeRun({ id: "r3", status: SyncRunStatus.Running, completedAt: null }), // excluded
    ];

    const summary = buildConnectorHealthSummary(makeConnector(), runs);

    expect(summary.avgDurationSeconds).toBe(90);
  });

  it("sums the persisted totals across successful runs as importedItems", () => {
    const runs = [
      makeRun({ totals: { persisted: 10 } }),
      makeRun({ id: "r2", totals: { persisted: 5 } }),
      makeRun({ id: "r3", status: SyncRunStatus.Failed, totals: { persisted: 999 }, completedAt: null }),
    ];

    const summary = buildConnectorHealthSummary(makeConnector(), runs);

    expect(summary.importedItems).toBe(15);
  });

  it("resolves lastSyncAt/lastStatus from the most recent run in the sample", () => {
    const runs = [makeRun({ id: "r1", status: SyncRunStatus.Partial, completedAt: "2026-07-02T00:00:00Z" })];

    const summary = buildConnectorHealthSummary(makeConnector(), runs);

    expect(summary.lastStatus).toBe(SyncRunStatus.Partial);
    expect(summary.lastSyncAt).toBe("2026-07-02T00:00:00Z");
  });

  it("computes healthScore as the weighted blend of uptime and (1-errorRate)", () => {
    const runs = [makeRun(), makeRun({ id: "r2", status: SyncRunStatus.Failed, completedAt: null })];
    // uptime = 50, errorRate = 0.5 -> healthScore = 50*0.6 + 50*0.4 = 50
    const summary = buildConnectorHealthSummary(makeConnector(), runs);

    expect(summary.healthScore).toBe(50);
  });
});
