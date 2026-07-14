import type { ProviderHealthSnapshot } from "../types/ProviderHealth";
import type { ExchangeRate } from "../types/Money";
import { ProviderStatus } from "../enums/ProviderStatus";

// Program ΔR — Mission ΔR-1.1 (Objetivo 5). A per-provider ProviderStatus
// answers "is this one provider working?" — it cannot answer the question
// an operator actually asks: "is the Exchange system, as a whole, serving
// real data right now?" This is that second, system-wide status, computed
// purely from data ExchangeDashboardService already fetches (provider
// snapshots + latest rates) — no new query, no new table, no migration.
export enum SystemExchangeStatus {
  NeverStarted = "never_started",
  Initializing = "initializing",
  Healthy = "healthy",
  Degraded = "degraded",
  UsingCachedRate = "using_cached_rate",
  Offline = "offline",
}

export interface SystemExchangeStatusResult {
  status: SystemExchangeStatus;
  /** Human-readable justification — every state must be explainable, never
   * a bare label (AI_CONSTITUTION's anti-black-box discipline applied here). */
  reason: string;
}

/** Below this many total sampled runs across all providers, a Healthy/Degraded
 * verdict isn't trustworthy yet — same "don't claim confidence you don't have"
 * discipline as every other composer's documented threshold this Release. */
const MIN_RUNS_FOR_CONFIDENCE = 3;

export function computeSystemExchangeStatus(
  providers: ProviderHealthSnapshot[],
  latestRates: (ExchangeRate | null)[]
): SystemExchangeStatusResult {
  if (providers.length === 0 || providers.every((p) => p.status === ProviderStatus.NeverStarted)) {
    return { status: SystemExchangeStatus.NeverStarted, reason: "Nenhum provedor jamais executou um refresh." };
  }

  const availableRates = latestRates.filter((r): r is ExchangeRate => r !== null);
  if (availableRates.length === 0) {
    return {
      status: SystemExchangeStatus.Offline,
      reason: "Nenhuma cotação disponível para nenhum par — nem mesmo um valor em cache.",
    };
  }

  const totalRuns = providers.reduce((sum, p) => sum + p.sampledRuns, 0);
  if (totalRuns < MIN_RUNS_FOR_CONFIDENCE) {
    return {
      status: SystemExchangeStatus.Initializing,
      reason: `Apenas ${totalRuns} execução(ões) registrada(s) até agora — histórico insuficiente para um veredito de saúde confiável.`,
    };
  }

  const anyHealthy = providers.some((p) => p.status === ProviderStatus.Healthy);
  const allDownOrNeverStarted = providers.every(
    (p) => p.status === ProviderStatus.Down || p.status === ProviderStatus.NeverStarted
  );

  if (allDownOrNeverStarted) {
    const freshestAgeMs = Math.min(...availableRates.map((r) => Date.now() - new Date(r.capturedAt).getTime()));
    const freshestAgeMin = Math.round(freshestAgeMs / 60_000);
    return {
      status: SystemExchangeStatus.UsingCachedRate,
      reason: `Todos os provedores estão fora do ar; servindo a última cotação real conhecida (capturada há ${freshestAgeMin} min).`,
    };
  }

  if (anyHealthy) {
    return { status: SystemExchangeStatus.Healthy, reason: "Ao menos um provedor saudável e cotações recentes disponíveis." };
  }

  return {
    status: SystemExchangeStatus.Degraded,
    reason: "Nenhum provedor totalmente saudável no momento, mas o sistema continua servindo cotações reais.",
  };
}
