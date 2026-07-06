import type { ProviderStatus } from "../enums/ProviderStatus";

export interface ProviderHealthSnapshot {
  providerId: string;
  providerName: string;
  priority: number;
  status: ProviderStatus;
  /** 0-100 composite, mirrors ConnectorHealthService's blend */
  healthScore: number;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  avgResponseTimeMs: number | null;
  /** 0-100: successful runs / sampled runs */
  uptime: number;
}
