import type { SyncRunStatus } from "../types/enums";

export interface SyncRun {
  id: string;
  connectorId: string;
  connectorKey: string;
  merchantId: string | null;
  batchId: string;
  dryRun: boolean;
  status: SyncRunStatus;
  totals: Record<string, unknown>;
  errors: unknown[] | null;
  startedAt: string;
  completedAt: string | null;
}
