export type ProviderRunStatus = "success" | "failure";

export interface CreateProviderRunInput {
  providerId: string;
  status: ProviderRunStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

export interface ProviderRun {
  id: string;
  providerId: string;
  status: ProviderRunStatus;
  responseTimeMs: number | null;
  errorMessage: string | null;
  attemptedAt: string;
}

export interface IExchangeProviderRunRepository {
  create(input: CreateProviderRunInput): Promise<ProviderRun | null>;
  findByProvider(providerId: string, limit?: number): Promise<ProviderRun[]>;
}
