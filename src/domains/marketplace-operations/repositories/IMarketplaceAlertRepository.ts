import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import type { MarketplaceAlertStatus, MarketplaceAlertType } from "../types/enums";

export interface IMarketplaceAlertRepository {
  /**
   * Open (pending/acknowledged) alerts of the given types — ONE query for the
   * whole sweep, not one per candidate.
   *
   * Before (Mission 05 incident, 2026-09-30): the sweep asked the database
   * "is there already an open alert for <type,subjectType,subjectId>?" once
   * PER rule result. `lowCoverageRule` emits one candidate per coverage gap,
   * so a single daily sweep issued ~400 sequential queries to
   * `marketplace_alerts` — measured in production (402 requests in one cron
   * run) and it landed exactly inside the pool-exhaustion window.
   */
  listOpen(alertTypes: MarketplaceAlertType[]): Promise<MarketplaceAlert[]>;
  create(input: AlertRuleResult): Promise<MarketplaceAlert | null>;
  list(status?: MarketplaceAlertStatus): Promise<MarketplaceAlert[]>;
  updateStatus(id: string, status: MarketplaceAlertStatus): Promise<MarketplaceAlert | null>;
}
