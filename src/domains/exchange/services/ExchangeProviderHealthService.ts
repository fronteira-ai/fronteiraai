import type { ExchangeProviderRegistryImpl } from "../providers/ExchangeProviderRegistry";
import type { IExchangeProviderRunRepository, ProviderRun } from "../repositories/IExchangeProviderRunRepository";
import { ProviderStatus } from "../enums/ProviderStatus";
import type { ProviderHealthSnapshot } from "../types/ProviderHealth";

const SAMPLE_SIZE = 20;

// Mirrors src/domains/connectors/services/ConnectorHealthService.ts almost
// exactly — same sample-window, same uptime/error-rate blend, same
// pure-function-plus-thin-class split for testability.
export class ExchangeProviderHealthService {
  constructor(
    private readonly registry: ExchangeProviderRegistryImpl,
    private readonly runRepo: IExchangeProviderRunRepository
  ) {}

  async getSnapshots(): Promise<ProviderHealthSnapshot[]> {
    const providers = this.registry.list();
    return Promise.all(
      providers.map(async (provider) => {
        const runs = await this.runRepo.findByProvider(provider.id, SAMPLE_SIZE);
        return buildProviderHealthSnapshot(provider.id, provider.name, provider.priority, runs);
      })
    );
  }
}

export function buildProviderHealthSnapshot(
  providerId: string,
  providerName: string,
  priority: number,
  runs: ProviderRun[]
): ProviderHealthSnapshot {
  if (runs.length === 0) {
    return {
      providerId,
      providerName,
      priority,
      status: ProviderStatus.Healthy,
      healthScore: 100,
      lastSuccessAt: null,
      lastFailureAt: null,
      avgResponseTimeMs: null,
      uptime: 100,
    };
  }

  const successRuns = runs.filter((r) => r.status === "success");
  const failureRuns = runs.filter((r) => r.status === "failure");
  const uptime = Math.round((successRuns.length / runs.length) * 100);
  const errorRate = failureRuns.length / runs.length;
  const healthScore = Math.round(uptime * 0.6 + (1 - errorRate) * 100 * 0.4);

  const durations = successRuns.map((r) => r.responseTimeMs).filter((d): d is number => d !== null);
  const avgResponseTimeMs =
    durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : null;

  const status =
    healthScore >= 80 ? ProviderStatus.Healthy : healthScore >= 40 ? ProviderStatus.Degraded : ProviderStatus.Down;

  return {
    providerId,
    providerName,
    priority,
    status,
    healthScore,
    // `runs` is already ordered most-recent-first (findByProvider), so the
    // first element after filtering is the most recent of that status.
    lastSuccessAt: successRuns[0]?.attemptedAt ?? null,
    lastFailureAt: failureRuns[0]?.attemptedAt ?? null,
    avgResponseTimeMs,
    uptime,
  };
}
