import type { ISyncScheduler, ScheduledConnector } from "./ISyncScheduler";

// Release 1.7 — Wave 2: fills the ISyncScheduler seam left in Epic 1.
//
// Deliberately NOT a cron-expression evaluator — real execution is
// interval-based, driven by `connectors.config.syncFrequencyHours` (jsonb,
// no migration needed) and checked directly in
// app/api/cron/connectors/sync/route.ts against each connector's last
// connector_sync_runs row. Building a real cron-expression parser (DST,
// "L"/"W" tokens, etc.) is real complexity for no product benefit here —
// "sync each connector periodically" is fully satisfied by the interval
// check. This class exists to satisfy the ISyncScheduler contract literally
// (so it can be introspected, e.g. surfaced on the Ecosystem Monitor page as
// "configured cadence") — `cronExpression` here holds a human-readable
// cadence string (e.g. "every 24h"), not a parsed expression.
export class VercelCronScheduler implements ISyncScheduler {
  private readonly schedules = new Map<string, ScheduledConnector>();

  registerConnector(connectorId: string, cronExpression: string): void {
    this.schedules.set(connectorId, { connectorId, cronExpression, enabled: true });
  }

  listSchedules(): ScheduledConnector[] {
    return [...this.schedules.values()];
  }
}
