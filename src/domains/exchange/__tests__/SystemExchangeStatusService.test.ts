import { computeSystemExchangeStatus, SystemExchangeStatus } from "../services/SystemExchangeStatusService";
import { ProviderStatus } from "../enums/ProviderStatus";
import type { ProviderHealthSnapshot } from "../types/ProviderHealth";
import type { ExchangeRate } from "../types/Money";
import { CurrencyPair } from "../enums/CurrencyPair";

function makeSnapshot(overrides: Partial<ProviderHealthSnapshot> = {}): ProviderHealthSnapshot {
  return {
    providerId: "p1",
    providerName: "Provider 1",
    priority: 1,
    status: ProviderStatus.Healthy,
    healthScore: 100,
    lastSuccessAt: new Date().toISOString(),
    lastFailureAt: null,
    avgResponseTimeMs: 200,
    uptime: 100,
    sampledRuns: 10,
    ...overrides,
  };
}

function makeRate(overrides: Partial<ExchangeRate> = {}): ExchangeRate {
  return { pair: CurrencyPair.UsdPyg, rate: 7900, source: "exchangerate-api", capturedAt: new Date().toISOString(), ...overrides };
}

describe("computeSystemExchangeStatus", () => {
  it("reports NeverStarted when every provider has never run — today's real production state", () => {
    const result = computeSystemExchangeStatus(
      [makeSnapshot({ status: ProviderStatus.NeverStarted, sampledRuns: 0, healthScore: 0, uptime: 0 })],
      []
    );
    expect(result.status).toBe(SystemExchangeStatus.NeverStarted);
  });

  it("reports Offline when providers have run but no rate is available anywhere, not even cached", () => {
    const result = computeSystemExchangeStatus([makeSnapshot({ status: ProviderStatus.Down, sampledRuns: 5 })], []);
    expect(result.status).toBe(SystemExchangeStatus.Offline);
  });

  it("reports Initializing when there is real data but too few sampled runs to trust a verdict", () => {
    const result = computeSystemExchangeStatus([makeSnapshot({ sampledRuns: 1 })], [makeRate()]);
    expect(result.status).toBe(SystemExchangeStatus.Initializing);
  });

  it("reports Healthy when at least one provider is healthy with enough history", () => {
    const result = computeSystemExchangeStatus([makeSnapshot({ status: ProviderStatus.Healthy, sampledRuns: 10 })], [makeRate()]);
    expect(result.status).toBe(SystemExchangeStatus.Healthy);
  });

  it("reports UsingCachedRate when every provider is down but a real rate still exists", () => {
    const result = computeSystemExchangeStatus(
      [makeSnapshot({ status: ProviderStatus.Down, sampledRuns: 10 })],
      [makeRate({ capturedAt: new Date(Date.now() - 20 * 60_000).toISOString() })]
    );
    expect(result.status).toBe(SystemExchangeStatus.UsingCachedRate);
    expect(result.reason).toMatch(/20 min/);
  });

  it("reports Degraded when no provider is fully healthy but the system is still serving real rates", () => {
    const result = computeSystemExchangeStatus([makeSnapshot({ status: ProviderStatus.Degraded, sampledRuns: 10 })], [makeRate()]);
    expect(result.status).toBe(SystemExchangeStatus.Degraded);
  });
});
