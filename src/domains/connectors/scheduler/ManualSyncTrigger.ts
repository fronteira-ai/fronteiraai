import type { IConnector } from "../types/connector.types";
import type { SyncOrchestrator, SyncRunOptions, SyncRunOutcome } from "../services/SyncOrchestrator";

// The only sync trigger that exists in Epic 1 — called directly by the
// admin/merchant "run import" API routes. Epic 2 adds a real scheduled
// trigger (ISyncScheduler + Vercel Cron route) that calls the same
// SyncOrchestrator underneath.
//
// Mission Ω-Pipeline (Scalable Connector Architecture) — prefers
// `connector.fetchStream()` + `syncOrchestrator.runStream()` when the
// connector implements it, so a full-catalog sync processes in bounded-size
// batches instead of materializing the whole catalog in memory first (the
// root cause of a real production OOM crash this Mission responds to). A
// connector that hasn't been migrated (no `fetchStream`) falls through to
// the exact same `fetch()` + `run()` path as before — zero behavior change.
export class ManualSyncTrigger {
  constructor(private readonly syncOrchestrator: SyncOrchestrator) {}

  async trigger(connector: IConnector, options: SyncRunOptions = {}): Promise<SyncRunOutcome> {
    const dryRun = options.dryRun ?? false;

    if (connector.fetchStream) {
      return this.syncOrchestrator.runStream(connector.metadata, connector.fetchStream({ dryRun }), options);
    }

    const batch = await connector.fetch({ dryRun });
    return this.syncOrchestrator.run(connector.metadata, batch.items, options);
  }
}
