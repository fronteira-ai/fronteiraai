import {
  connectorDownRule,
  storeNotSyncingRule,
  lowCoverageRule,
  discoveryStalledRule,
  claimPendingRule,
  canonicalMergeBacklogRule,
  healthScoreDroppedRule,
  lowFreshnessRule,
} from "../services/AlertRules";
import { MarketplaceAlertType, MarketplaceAlertSeverity, MarketplaceHealthFactor, MarketplaceHealthStatus, CoverageDimension } from "../types/enums";
import type { ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";
import type { MarketplaceHealthBreakdown } from "../types/health.types";

function makeSummary(overrides: Partial<ConnectorHealthSummary> = {}): ConnectorHealthSummary {
  return {
    connectorKey: "c1",
    name: "Conector 1",
    status: "active",
    storeSlug: "loja-1",
    lastSyncAt: new Date().toISOString(),
    lastStatus: "success",
    errorRate: 0,
    uptime: 100,
    avgDurationSeconds: 30,
    importedItems: 10,
    failureCount: 0,
    healthScore: 100,
    ...overrides,
  };
}

describe("connectorDownRule", () => {
  it("flags connectors whose last run failed", () => {
    const alerts = connectorDownRule([makeSummary({ lastStatus: "failed" }), makeSummary({ lastStatus: "success" })]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe(MarketplaceAlertType.ConnectorDown);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Critical);
  });

  it("returns no alerts when all connectors are healthy", () => {
    expect(connectorDownRule([makeSummary()])).toEqual([]);
  });
});

describe("storeNotSyncingRule", () => {
  it("flags a store whose last sync is older than the stale threshold", () => {
    const staleDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const alerts = storeNotSyncingRule([makeSummary({ lastSyncAt: staleDate })], 7);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].alertType).toBe(MarketplaceAlertType.StoreNotSyncing);
  });

  it("flags a connector that has never synced (lastSyncAt null)", () => {
    const alerts = storeNotSyncingRule([makeSummary({ lastSyncAt: null })]);
    expect(alerts).toHaveLength(1);
  });

  it("does not flag a recently synced store", () => {
    const alerts = storeNotSyncingRule([makeSummary({ lastSyncAt: new Date().toISOString() })], 7);
    expect(alerts).toEqual([]);
  });
});

describe("lowCoverageRule", () => {
  it("produces one alert per gap, tagged by dimension", () => {
    const alerts = lowCoverageRule([
      { dimension: CoverageDimension.Category, id: "c1", name: "Nicho", productCount: 1 },
      { dimension: CoverageDimension.Brand, id: "b1", name: "Marca X", productCount: 0 },
    ]);
    expect(alerts).toHaveLength(2);
    expect(alerts[0].subjectType).toBe("category");
    expect(alerts[1].subjectType).toBe("brand");
  });
});

describe("discoveryStalledRule", () => {
  it("flags when discovery has never run", () => {
    expect(discoveryStalledRule(null)).toHaveLength(1);
  });

  it("flags when the last discovery is older than the stale threshold", () => {
    const stale = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    expect(discoveryStalledRule(stale, 30)).toHaveLength(1);
  });

  it("does not flag recent discovery activity", () => {
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    expect(discoveryStalledRule(recent, 30)).toEqual([]);
  });
});

describe("claimPendingRule", () => {
  it("returns no alert when there is no backlog", () => {
    expect(claimPendingRule(0)).toEqual([]);
  });

  it("returns an info-severity alert for a small backlog", () => {
    const alerts = claimPendingRule(2);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Info);
  });

  it("escalates to warning severity for a larger backlog", () => {
    const alerts = claimPendingRule(5);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Warning);
  });
});

describe("canonicalMergeBacklogRule", () => {
  it("does not alert below the threshold", () => {
    expect(canonicalMergeBacklogRule(9, 10)).toEqual([]);
  });

  it("alerts at or above the threshold", () => {
    expect(canonicalMergeBacklogRule(10, 10)).toHaveLength(1);
  });
});

describe("healthScoreDroppedRule", () => {
  it("does nothing without a previous score", () => {
    expect(healthScoreDroppedRule(null, 50)).toEqual([]);
  });

  it("does nothing when the drop is below the threshold", () => {
    expect(healthScoreDroppedRule(90, 85, 10)).toEqual([]);
  });

  it("flags a warning-level drop", () => {
    const alerts = healthScoreDroppedRule(90, 78, 10);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Warning);
  });

  it("flags a critical-level drop", () => {
    const alerts = healthScoreDroppedRule(90, 60, 10);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Critical);
  });
});

describe("lowFreshnessRule", () => {
  function makeBreakdown(freshnessScore: number): MarketplaceHealthBreakdown {
    return {
      overallScore: 70,
      status: MarketplaceHealthStatus.Attention,
      generatedAt: new Date().toISOString(),
      factors: [{ factor: MarketplaceHealthFactor.Freshness, weight: 15, score: freshnessScore, weightedScore: 0, detail: "" }],
    };
  }

  it("does not alert when freshness is above the threshold", () => {
    expect(lowFreshnessRule(makeBreakdown(50), 40)).toEqual([]);
  });

  it("alerts at warning severity just below the threshold", () => {
    const alerts = lowFreshnessRule(makeBreakdown(30), 40);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Warning);
  });

  it("alerts at critical severity when very low", () => {
    const alerts = lowFreshnessRule(makeBreakdown(10), 40);
    expect(alerts[0].severity).toBe(MarketplaceAlertSeverity.Critical);
  });
});
