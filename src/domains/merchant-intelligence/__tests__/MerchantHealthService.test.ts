import { buildMerchantHealth } from "../services/MerchantHealthService";
import { HealthStatus, HealthDimension } from "../types/enums";
import type { ExecutiveSummary } from "../types/merchant-intelligence.types";

function makeSummary(overrides: Partial<ExecutiveSummary> = {}): ExecutiveSummary {
  return {
    merchantId: "m1",
    companyName: "Loja Teste",
    plan: "free",
    totalProducts: 50,
    activeProducts: 45,
    incompleteProducts: 5,
    trustScore: 65,
    verificationCount: 2,
    activeSignalCount: 3,
    totalReviews: 5,
    averageRating: 4.2,
    contactsAvailable: 4,
    contactsTotal: 4,
    lastImportAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastImportSuccess: true,
    daysSinceLastImport: 2,
    onboardingDone: true,
    verifiedLevel: "verified",
    merchantScore: 75,
    generatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildMerchantHealth", () => {
  it("returns 5 dimensions always", () => {
    const health = buildMerchantHealth(makeSummary());
    expect(health.dimensions).toHaveLength(5);
    const dims = health.dimensions.map((d) => d.dimension);
    expect(dims).toContain(HealthDimension.Catalog);
    expect(dims).toContain(HealthDimension.Trust);
    expect(dims).toContain(HealthDimension.Updates);
    expect(dims).toContain(HealthDimension.Profile);
    expect(dims).toContain(HealthDimension.Visibility);
  });

  it("rates catalog as Excellent when complete and fresh", () => {
    const health = buildMerchantHealth(
      makeSummary({ totalProducts: 100, incompleteProducts: 5, daysSinceLastImport: 3 })
    );
    const cat = health.dimensions.find((d) => d.dimension === HealthDimension.Catalog)!;
    expect(cat.status).toBe(HealthStatus.Excellent);
  });

  it("rates catalog as Attention when no products", () => {
    const health = buildMerchantHealth(
      makeSummary({ totalProducts: 0, incompleteProducts: 0, lastImportAt: null, daysSinceLastImport: null })
    );
    const cat = health.dimensions.find((d) => d.dimension === HealthDimension.Catalog)!;
    expect(cat.status).toBe(HealthStatus.Attention);
    expect(cat.howToImprove).not.toBeNull();
  });

  it("rates trust as Excellent when all signals present", () => {
    const health = buildMerchantHealth(
      makeSummary({
        trustScore: 70,
        verificationCount: 3,
        activeSignalCount: 5,
        totalReviews: 10,
        verifiedLevel: "verified",
      })
    );
    const trust = health.dimensions.find((d) => d.dimension === HealthDimension.Trust)!;
    expect(trust.status).toBe(HealthStatus.Excellent);
    expect(trust.howToImprove).toBeNull();
  });

  it("rates trust as Attention when no signals", () => {
    const health = buildMerchantHealth(
      makeSummary({ trustScore: 0, verificationCount: 0, activeSignalCount: 0, totalReviews: 0, verifiedLevel: "none" })
    );
    const trust = health.dimensions.find((d) => d.dimension === HealthDimension.Trust)!;
    expect(trust.status).toBe(HealthStatus.Attention);
  });

  it("rates updates as Attention when last import failed", () => {
    const health = buildMerchantHealth(
      makeSummary({ lastImportAt: new Date().toISOString(), lastImportSuccess: false, daysSinceLastImport: 0 })
    );
    const upd = health.dimensions.find((d) => d.dimension === HealthDimension.Updates)!;
    expect(upd.status).toBe(HealthStatus.Attention);
  });

  it("rates updates as Excellent when synced today", () => {
    const health = buildMerchantHealth(
      makeSummary({ lastImportAt: new Date().toISOString(), lastImportSuccess: true, daysSinceLastImport: 0 })
    );
    const upd = health.dimensions.find((d) => d.dimension === HealthDimension.Updates)!;
    expect(upd.status).toBe(HealthStatus.Excellent);
  });

  it("rates profile as Attention when no contacts", () => {
    const health = buildMerchantHealth(
      makeSummary({ contactsAvailable: 0, onboardingDone: false })
    );
    const prof = health.dimensions.find((d) => d.dimension === HealthDimension.Profile)!;
    expect(prof.status).toBe(HealthStatus.Attention);
  });

  it("counts overallAttentionCount correctly", () => {
    const health = buildMerchantHealth(
      makeSummary({ totalProducts: 0, contactsAvailable: 0, trustScore: 0, verifiedLevel: "none", lastImportAt: null })
    );
    expect(health.overallAttentionCount).toBeGreaterThanOrEqual(3);
  });

  it("includes merchantId in result", () => {
    const health = buildMerchantHealth(makeSummary({ merchantId: "xyz-123" }));
    expect(health.merchantId).toBe("xyz-123");
  });
});
