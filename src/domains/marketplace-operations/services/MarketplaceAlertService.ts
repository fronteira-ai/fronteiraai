import type { IMarketplaceAlertRepository } from "../repositories/IMarketplaceAlertRepository";
import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import { MarketplaceAlertStatus } from "../types/enums";

// Epic 8 — Marketplace Alert Engine. Lifecycle mirrors merchant-decision's
// ActionService/ActionStatus: dedupe-on-create so re-running the rule sweep
// never spams duplicates for a condition that's still open.
export class MarketplaceAlertService {
  constructor(private readonly alertRepo: IMarketplaceAlertRepository) {}

  async sync(results: AlertRuleResult[]): Promise<MarketplaceAlert[]> {
    const created: MarketplaceAlert[] = [];
    for (const result of results) {
      const existing = await this.alertRepo.findOpenByKey(result.alertType, result.subjectType, result.subjectId);
      if (existing) continue;
      const alert = await this.alertRepo.create(result);
      if (alert) created.push(alert);
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
