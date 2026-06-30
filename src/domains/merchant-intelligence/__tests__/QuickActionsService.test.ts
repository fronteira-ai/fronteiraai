import { buildQuickActions } from "../services/QuickActionsService";
import { ActionPriority, CatalogIssueType, InsightSeverity, HealthStatus, HealthDimension } from "../types/enums";
import type { ExecutiveSummary, MerchantHealth, CatalogIntelligence } from "../types/merchant-intelligence.types";

function makeHealthDim(dimension: HealthDimension, status: HealthStatus) {
  return {
    dimension,
    label: dimension,
    status,
    statusLabel: status,
    reason: "test",
    howToImprove: null,
    icon: "📦",
  };
}

function makeHealth(overrides: { trustStatus?: HealthStatus; profileStatus?: HealthStatus } = {}): MerchantHealth {
  return {
    merchantId: "m1",
    dimensions: [
      makeHealthDim(HealthDimension.Catalog, HealthStatus.Good),
      makeHealthDim(HealthDimension.Trust, overrides.trustStatus ?? HealthStatus.Good),
      makeHealthDim(HealthDimension.Updates, HealthStatus.Good),
      makeHealthDim(HealthDimension.Profile, overrides.profileStatus ?? HealthStatus.Excellent),
      makeHealthDim(HealthDimension.Visibility, HealthStatus.Good),
    ],
    overallAttentionCount: 0,
    generatedAt: new Date().toISOString(),
  };
}

function makeSummary(overrides: Partial<ExecutiveSummary> = {}): ExecutiveSummary {
  return {
    merchantId: "m1",
    companyName: "Loja",
    plan: "free",
    totalProducts: 50,
    activeProducts: 45,
    incompleteProducts: 3,
    trustScore: 60,
    verificationCount: 1,
    activeSignalCount: 2,
    totalReviews: 3,
    averageRating: 4.0,
    contactsAvailable: 4,
    contactsTotal: 4,
    lastImportAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    lastImportSuccess: true,
    daysSinceLastImport: 3,
    onboardingDone: true,
    verifiedLevel: "verified",
    merchantScore: 70,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeCatalog(overrides: Partial<CatalogIntelligence> = {}): CatalogIntelligence {
  return {
    merchantId: "m1",
    totalProducts: 50,
    healthScore: 80,
    issues: [],
    insights: [],
    lastImportAt: new Date().toISOString(),
    daysSinceLastImport: 3,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildQuickActions", () => {
  it("returns no more than 5 actions", () => {
    const result = buildQuickActions(
      makeSummary({ totalProducts: 0, contactsAvailable: 0, daysSinceLastImport: 90, totalReviews: 0 }),
      makeHealth({ trustStatus: HealthStatus.Attention, profileStatus: HealthStatus.Attention }),
      makeCatalog({ issues: [
        { type: CatalogIssueType.NoImage, severity: InsightSeverity.Critical, label: "Sem imagem", count: 20, total: 50, percentage: 40, description: "", impact: "", actionHref: "", actionLabel: "" },
        { type: CatalogIssueType.NoPrice, severity: InsightSeverity.Critical, label: "Sem preço", count: 5, total: 50, percentage: 10, description: "", impact: "", actionHref: "", actionLabel: "" },
      ] })
    );
    expect(result.actions.length).toBeLessThanOrEqual(5);
  });

  it("generates critical action when no products", () => {
    const result = buildQuickActions(
      makeSummary({ totalProducts: 0 }),
      makeHealth(),
      makeCatalog({ totalProducts: 0, issues: [] })
    );
    const critical = result.actions.find((a) => a.id === "first_import");
    expect(critical).toBeDefined();
    expect(critical!.priority).toBe(ActionPriority.Critical);
  });

  it("generates stale sync action when 31 days since last import", () => {
    const result = buildQuickActions(
      makeSummary({ daysSinceLastImport: 31 }),
      makeHealth(),
      makeCatalog({ daysSinceLastImport: 31 })
    );
    const stale = result.actions.find((a) => a.id === "sync_stale");
    expect(stale).toBeDefined();
    expect(stale!.priority).toBe(ActionPriority.Critical);
  });

  it("sorts critical before high before medium", () => {
    const result = buildQuickActions(
      makeSummary({ totalProducts: 0, daysSinceLastImport: 31 }),
      makeHealth({ trustStatus: HealthStatus.Attention }),
      makeCatalog({ issues: [] })
    );
    const priorities = result.actions.map((a) => a.priority);
    const order = [ActionPriority.Critical, ActionPriority.High, ActionPriority.Medium, ActionPriority.Low];
    for (let i = 1; i < priorities.length; i++) {
      expect(order.indexOf(priorities[i])).toBeGreaterThanOrEqual(order.indexOf(priorities[i - 1]));
    }
  });

  it("returns empty actions when merchant is healthy", () => {
    const result = buildQuickActions(
      makeSummary({ daysSinceLastImport: 1, totalReviews: 5, totalProducts: 100 }),
      makeHealth(),
      makeCatalog({ issues: [], healthScore: 95 })
    );
    expect(result.actions.length).toBe(0);
  });

  it("includes merchantId in result", () => {
    const result = buildQuickActions(makeSummary({ merchantId: "abc" }), makeHealth(), makeCatalog());
    expect(result.merchantId).toBe("abc");
  });
});
