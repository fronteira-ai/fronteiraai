import { buildProviderHealthSnapshot } from "../services/ExchangeProviderHealthService";
import { ProviderStatus } from "../enums/ProviderStatus";
import type { ProviderRun } from "../repositories/IExchangeProviderRunRepository";

function makeRun(overrides: Partial<ProviderRun> = {}): ProviderRun {
  return {
    id: "r1",
    providerId: "exchangerate-api",
    status: "success",
    responseTimeMs: 200,
    errorMessage: null,
    attemptedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildProviderHealthSnapshot", () => {
  it("reports full health with no evidence of failure for an empty sample", () => {
    const snapshot = buildProviderHealthSnapshot("p1", "Provider 1", 1, []);
    expect(snapshot.status).toBe(ProviderStatus.Healthy);
    expect(snapshot.healthScore).toBe(100);
    expect(snapshot.uptime).toBe(100);
    expect(snapshot.avgResponseTimeMs).toBeNull();
  });

  it("computes uptime and healthScore proportionally to the sample", () => {
    const runs = [
      makeRun({ status: "success" }),
      makeRun({ id: "r2", status: "failure", responseTimeMs: null }),
      makeRun({ id: "r3", status: "success" }),
      makeRun({ id: "r4", status: "failure", responseTimeMs: null }),
    ];
    const snapshot = buildProviderHealthSnapshot("p1", "Provider 1", 1, runs);
    expect(snapshot.uptime).toBe(50);
  });

  it("classifies status by the documented healthScore thresholds", () => {
    const allSuccess = Array.from({ length: 5 }, () => makeRun());
    expect(buildProviderHealthSnapshot("p1", "P", 1, allSuccess).status).toBe(ProviderStatus.Healthy);

    const halfFailing = [makeRun(), makeRun({ status: "failure", responseTimeMs: null })];
    expect(buildProviderHealthSnapshot("p1", "P", 1, halfFailing).status).toBe(ProviderStatus.Degraded);

    const allFailing = [
      makeRun({ status: "failure", responseTimeMs: null }),
      makeRun({ status: "failure", responseTimeMs: null }),
    ];
    expect(buildProviderHealthSnapshot("p1", "P", 1, allFailing).status).toBe(ProviderStatus.Down);
  });

  it("averages response time across successful runs only", () => {
    const runs = [makeRun({ responseTimeMs: 100 }), makeRun({ id: "r2", responseTimeMs: 300 })];
    expect(buildProviderHealthSnapshot("p1", "P", 1, runs).avgResponseTimeMs).toBe(200);
  });

  it("resolves lastSuccessAt/lastFailureAt from the most recent run of each status", () => {
    const runs = [
      makeRun({ id: "r1", status: "success", attemptedAt: "2026-07-02T00:00:00Z" }),
      makeRun({ id: "r2", status: "failure", responseTimeMs: null, attemptedAt: "2026-07-01T00:00:00Z" }),
    ];
    const snapshot = buildProviderHealthSnapshot("p1", "P", 1, runs);
    expect(snapshot.lastSuccessAt).toBe("2026-07-02T00:00:00Z");
    expect(snapshot.lastFailureAt).toBe("2026-07-01T00:00:00Z");
  });
});
