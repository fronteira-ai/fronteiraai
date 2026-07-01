import type { SyncRun } from "../domain/SyncRun";
import type { SyncRunStatus } from "../types/enums";

export interface CreateSyncRunInput {
  connectorId: string;
  connectorKey: string;
  merchantId?: string | null;
  batchId: string;
  dryRun: boolean;
}

export interface UpdateSyncRunInput {
  status: SyncRunStatus;
  totals?: Record<string, unknown>;
  errors?: unknown[] | null;
  completedAt?: string;
}

export interface ISyncRunRepository {
  create(input: CreateSyncRunInput): Promise<SyncRun | null>;
  update(id: string, input: UpdateSyncRunInput): Promise<SyncRun | null>;
  findByConnector(connectorId: string, limit?: number): Promise<SyncRun[]>;
  findByMerchant(merchantId: string, limit?: number): Promise<SyncRun[]>;
}
