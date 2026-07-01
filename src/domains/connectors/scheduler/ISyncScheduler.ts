// Interface-only seam for Epic 2's real Vercel Cron wiring. No implementation
// exists yet in Epic 1 — there is no cron/queue infrastructure anywhere in
// this project today (see RELEASE_1_7_BLUEPRINT.md, Capítulo 1).

export interface ScheduledConnector {
  connectorId: string;
  cronExpression: string;
  enabled: boolean;
}

export interface ISyncScheduler {
  registerConnector(connectorId: string, cronExpression: string): void;
  listSchedules(): ScheduledConnector[];
}
