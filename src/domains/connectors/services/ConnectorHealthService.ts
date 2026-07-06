import type { IConnectorRepository } from "../repositories/IConnectorRepository";
import type { ISyncRunRepository } from "../repositories/ISyncRunRepository";
import type { Connector } from "../domain/Connector";
import type { SyncRun } from "../domain/SyncRun";

// Marketplace Operations — Epic 5 (Connector Health Engine). Extends the
// per-connector health computation that already existed inline in
// app/api/admin/monitor/summary/route.ts (Release 1.7 — Wave 2) rather than
// duplicating it — that route now delegates here. Computed on read from
// connector_sync_runs, no new aggregate table (ADR-034).
export interface ConnectorHealthSummary {
  connectorKey: string;
  name: string;
  status: string;
  storeSlug: string;
  lastSyncAt: string | null;
  lastStatus: string | null;
  /** failed / sampled runs */
  errorRate: number;
  /** 0-100: successful / sampled runs */
  uptime: number;
  /** average wall-clock duration of completed successful runs in the sample, seconds. null if none completed. */
  avgDurationSeconds: number | null;
  /**
   * Items persisted (offers written/updated, with their product created if new) across
   * successful runs in the sample. `connector_sync_runs.totals` (PipelineMetrics) only tracks
   * a single "persisted" counter — there is no separate product-vs-offer count per run, so this
   * is reported as one honest number rather than two fabricated ones. See TECH_DEBT.md.
   */
  importedItems: number;
  failureCount: number;
  /** 0-100 composite: 60% uptime + 40% (1 - errorRate) */
  healthScore: number;
}

const SAMPLE_SIZE = 20;

export class ConnectorHealthService {
  constructor(
    private readonly connectorRepo: IConnectorRepository,
    private readonly syncRunRepo: ISyncRunRepository
  ) {}

  async getSummaries(): Promise<ConnectorHealthSummary[]> {
    const connectors = await this.connectorRepo.list();
    return Promise.all(
      connectors.map(async (connector) => {
        const recent = await this.syncRunRepo.findByConnector(connector.id, SAMPLE_SIZE);
        return buildConnectorHealthSummary(connector, recent);
      })
    );
  }
}

// Pure and exported separately so it's directly unit-testable without a
// repository/Supabase client — mirrors this project's convention of keeping
// the scoring math itself free of I/O (see catalog-intelligence/ProductHealthService).
export function buildConnectorHealthSummary(connector: Connector, recent: SyncRun[]): ConnectorHealthSummary {
  const lastRun = recent[0] ?? null;
  const failureCount = recent.filter((r) => r.status === "failed").length;
  const errorRate = recent.length > 0 ? failureCount / recent.length : 0;

  const successRuns = recent.filter((r) => r.status === "success");
  const uptime = recent.length > 0 ? Math.round((successRuns.length / recent.length) * 100) : 100;

  const durations = successRuns
    .filter((r) => r.completedAt)
    .map((r) => (new Date(r.completedAt as string).getTime() - new Date(r.startedAt).getTime()) / 1000)
    .filter((seconds) => seconds >= 0);
  const avgDurationSeconds =
    durations.length > 0 ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length) : null;

  const importedItems = successRuns.reduce((sum, r) => sum + toNumber(r.totals?.persisted), 0);

  const healthScore = Math.round(uptime * 0.6 + (1 - errorRate) * 100 * 0.4);

  return {
    connectorKey: connector.connectorKey,
    name: connector.name,
    status: connector.status,
    storeSlug: connector.storeSlug,
    lastSyncAt: lastRun?.completedAt ?? lastRun?.startedAt ?? null,
    lastStatus: lastRun?.status ?? null,
    errorRate,
    uptime,
    avgDurationSeconds,
    importedItems,
    failureCount,
    healthScore,
  };
}

function toNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}
