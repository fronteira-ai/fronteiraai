import type { IConnector } from "../types/connector.types";
import type { SyncOrchestrator, SyncRunOptions, SyncRunOutcome } from "../services/SyncOrchestrator";

// The only sync trigger that exists in Epic 1 — called directly by the
// admin/merchant "run import" API routes. Epic 2 adds a real scheduled
// trigger (ISyncScheduler + Vercel Cron route) that calls the same
// SyncOrchestrator underneath.
export class ManualSyncTrigger {
  constructor(private readonly syncOrchestrator: SyncOrchestrator) {}

  async trigger(connector: IConnector, options: SyncRunOptions = {}): Promise<SyncRunOutcome> {
    const batch = await connector.fetch();
    return this.syncOrchestrator.run(connector.metadata, batch.items, options);
  }
}
