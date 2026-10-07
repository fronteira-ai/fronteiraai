import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import type { MarketplaceAlertStatus, MarketplaceAlertType } from "../types/enums";

export interface IMarketplaceAlertRepository {
  /**
   * Every open (pending/acknowledged) alert of the given types — **the COMPLETE
   * set**, paginated across PostgREST's `PGRST_DB_MAX_ROWS` cap, or an error.
   *
   * Mission 05 / 2026-09-30: the sweep used to ask "is there already an open
   * alert for <type,subjectType,subjectId>?" once PER rule result.
   * `lowCoverageRule` emits one candidate per coverage gap, so a single sweep
   * issued ~400 sequential queries to `marketplace_alerts` — measured in
   * production (402 requests in one cron run), inside the PostgREST
   * pool-exhaustion window.
   *
   * Mission 05.5 / 2026-10-07 (P0, data integrity): the first fix collapsed
   * that into a single batched read, but PostgREST silently truncates at 1000
   * rows. Once more than 1000 alerts were open the returned set was
   * incomplete, the dedupe could not see existing alerts, and the daily sweep
   * re-created ~500 of them (`marketplace_alerts`: 626 → 4.216 rows in 7 days).
   * Implementations MUST page until exhaustion and MUST NOT return a partial
   * set: throwing is the correct failure mode, because a partial set becomes
   * duplicate INSERTs downstream.
   */
  listOpen(alertTypes: MarketplaceAlertType[]): Promise<MarketplaceAlert[]>;
  create(input: AlertRuleResult): Promise<MarketplaceAlert | null>;
  list(status?: MarketplaceAlertStatus): Promise<MarketplaceAlert[]>;
  updateStatus(id: string, status: MarketplaceAlertStatus): Promise<MarketplaceAlert | null>;
}
