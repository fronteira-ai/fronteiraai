import type {
  MarketplaceAlertType,
  MarketplaceAlertSeverity,
  MarketplaceAlertStatus,
  MarketplaceAlertSubjectType,
} from "./enums";

export interface MarketplaceAlert {
  id: string;
  alertType: MarketplaceAlertType;
  severity: MarketplaceAlertSeverity;
  status: MarketplaceAlertStatus;
  subjectType: MarketplaceAlertSubjectType | null;
  subjectId: string | null;
  title: string;
  detail: Record<string, unknown>;
  createdAt: string;
  resolvedAt: string | null;
}

// The output of a rule evaluation, before it's persisted/deduped by
// MarketplaceAlertService — mirrors DecisionAction's rule_id-based dedupe
// but keyed on (alertType, subjectType, subjectId).
export interface AlertRuleResult {
  alertType: MarketplaceAlertType;
  severity: MarketplaceAlertSeverity;
  subjectType: MarketplaceAlertSubjectType | null;
  subjectId: string | null;
  title: string;
  detail: Record<string, unknown>;
}
