import type { MarketplaceAlert, AlertRuleResult } from "../types/alerts.types";
import type { MarketplaceAlertStatus, MarketplaceAlertType, MarketplaceAlertSubjectType } from "../types/enums";

export interface IMarketplaceAlertRepository {
  findOpenByKey(
    alertType: MarketplaceAlertType,
    subjectType: MarketplaceAlertSubjectType | null,
    subjectId: string | null
  ): Promise<MarketplaceAlert | null>;
  create(input: AlertRuleResult): Promise<MarketplaceAlert | null>;
  list(status?: MarketplaceAlertStatus): Promise<MarketplaceAlert[]>;
  updateStatus(id: string, status: MarketplaceAlertStatus): Promise<MarketplaceAlert | null>;
}
