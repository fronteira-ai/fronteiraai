import type { IMarketplaceAlertRepository } from "../repositories/IMarketplaceAlertRepository";
import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import { MarketplaceAlertStatus, type MarketplaceAlertType, type MarketplaceAlertSubjectType } from "../types/enums";

// Epic 8 — Marketplace Alert Engine. Lifecycle mirrors merchant-decision's
// ActionService/ActionStatus: dedupe-on-create so re-running the rule sweep
// never spams duplicates for a condition that's still open.
//
// Mission 05 (2026-09-30 incident): the dedupe used to be one repository read
// PER candidate (N+1). `lowCoverageRule` emits one candidate per coverage gap,
// so a single sweep of the daily cron issued ~400 sequential queries against
// `marketplace_alerts` — measured in production as 402 requests inside the
// very window where the PostgREST pool ran out (PGRST003/504). The dedupe is
// now a single batched read per distinct alert type (bounded by the number of
// alert types, not by the size of the backlog).
export class MarketplaceAlertService {
  constructor(private readonly alertRepo: IMarketplaceAlertRepository) {}

  async sync(results: AlertRuleResult[]): Promise<MarketplaceAlert[]> {
    if (results.length === 0) return [];

    const alertTypes = Array.from(new Set(results.map((r) => r.alertType)));
    const open = await this.alertRepo.listOpen(alertTypes);
    const openKeys = new Set(open.map((a) => alertKey(a.alertType, a.subjectType, a.subjectId)));

    const created: MarketplaceAlert[] = [];
    for (const result of results) {
      const key = alertKey(result.alertType, result.subjectType, result.subjectId);
      if (openKeys.has(key)) continue;
      const alert = await this.alertRepo.create(result);
      if (alert) {
        // Guards against two identical candidates in the same sweep — with the
        // old per-candidate read the second one would have found the row the
        // first one just inserted.
        openKeys.add(key);
        created.push(alert);
      }
    }
    return created;
  }

  async list(status?: MarketplaceAlertStatus): Promise<MarketplaceAlert[]> {
    return this.alertRepo.list(status);
  }

  async acknowledge(id: string): Promise<MarketplaceAlert | null> {
    return this.alertRepo.updateStatus(id, MarketplaceAlertStatus.Acknowledged);
  }

  async resolve(id: string): Promise<MarketplaceAlert | null> {
    return this.alertRepo.updateStatus(id, MarketplaceAlertStatus.Resolved);
  }

  async ignore(id: string): Promise<MarketplaceAlert | null> {
    return this.alertRepo.updateStatus(id, MarketplaceAlertStatus.Ignored);
  }
}

/** Same identity the previous per-candidate query used: type + subject, null-safe. */
function alertKey(
  alertType: MarketplaceAlertType,
  subjectType: MarketplaceAlertSubjectType | null,
  subjectId: string | null
): string {
  return `${alertType}|${subjectType ?? ""}|${subjectId ?? ""}`;
}
