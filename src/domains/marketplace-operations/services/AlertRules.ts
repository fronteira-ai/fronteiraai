import { MarketplaceAlertType, MarketplaceAlertSeverity, MarketplaceHealthFactor } from "../types/enums";
import type { AlertRuleResult } from "../types/alerts.types";
import type { CoverageGap } from "../types/coverage.types";
import type { MarketplaceHealthBreakdown } from "../types/health.types";
import type { ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";

// Epic 8 — Marketplace Alert Engine. Pure rule functions (mirrors
// merchant-decision/rules/) — each takes already-fetched data and returns
// zero or more candidate alerts. MarketplaceAlertService owns dedupe/
// persistence; these functions have no I/O and are directly unit-testable.

export function connectorDownRule(summaries: ConnectorHealthSummary[]): AlertRuleResult[] {
  return summaries
    .filter((s) => s.lastStatus === "failed")
    .map((s) => ({
      alertType: MarketplaceAlertType.ConnectorDown,
      severity: MarketplaceAlertSeverity.Critical,
      subjectType: "connector",
      subjectId: s.connectorKey,
      title: `Conector "${s.name}" com última sincronização falha`,
      detail: { connectorKey: s.connectorKey, errorRate: s.errorRate },
    }));
}

export function storeNotSyncingRule(summaries: ConnectorHealthSummary[], staleDays = 7): AlertRuleResult[] {
  const now = Date.now();
  return summaries
    .filter((s) => {
      if (!s.lastSyncAt) return true;
      const ageDays = (now - new Date(s.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
      return ageDays > staleDays;
    })
    .map((s) => ({
      alertType: MarketplaceAlertType.StoreNotSyncing,
      severity: MarketplaceAlertSeverity.Warning,
      subjectType: "store",
      subjectId: s.storeSlug,
      title: `Loja "${s.storeSlug}" sem sincronização há mais de ${staleDays} dia(s)`,
      detail: { connectorKey: s.connectorKey, lastSyncAt: s.lastSyncAt },
    }));
}

export function lowCoverageRule(gaps: CoverageGap[]): AlertRuleResult[] {
  return gaps.map((g) => ({
    alertType: MarketplaceAlertType.LowCoverage,
    severity: MarketplaceAlertSeverity.Info,
    subjectType: g.dimension === "brand" ? "brand" : "category",
    subjectId: g.id,
    title: `Baixa cobertura em ${g.dimension === "brand" ? "marca" : "categoria"} "${g.name}" (${g.productCount} produto(s))`,
    detail: { dimension: g.dimension, productCount: g.productCount },
  }));
}

export function discoveryStalledRule(lastDiscoveredAt: string | null, staleDays = 30): AlertRuleResult[] {
  if (!lastDiscoveredAt) {
    return [
      {
        alertType: MarketplaceAlertType.DiscoveryStalled,
        severity: MarketplaceAlertSeverity.Info,
        subjectType: "marketplace",
        subjectId: null,
        title: "Nenhuma loja descoberta via Discovery ainda",
        detail: {},
      },
    ];
  }

  const ageDays = (Date.now() - new Date(lastDiscoveredAt).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= staleDays) return [];

  return [
    {
      alertType: MarketplaceAlertType.DiscoveryStalled,
      severity: MarketplaceAlertSeverity.Warning,
      subjectType: "marketplace",
      subjectId: null,
      title: `Discovery sem novas lojas há ${Math.round(ageDays)} dia(s)`,
      detail: { lastDiscoveredAt },
    },
  ];
}

export function claimPendingRule(pendingClaimsCount: number): AlertRuleResult[] {
  // One aggregate alert for the whole backlog, not one per claim — avoids
  // spamming dozens of alerts for a routine review queue.
  if (pendingClaimsCount === 0) return [];
  return [
    {
      alertType: MarketplaceAlertType.ClaimPending,
      severity: pendingClaimsCount >= 5 ? MarketplaceAlertSeverity.Warning : MarketplaceAlertSeverity.Info,
      subjectType: "marketplace",
      subjectId: null,
      title: `${pendingClaimsCount} claim(s) aguardando revisão`,
      detail: { count: pendingClaimsCount },
    },
  ];
}

export function canonicalMergeBacklogRule(pendingCount: number, threshold = 10): AlertRuleResult[] {
  if (pendingCount < threshold) return [];
  return [
    {
      alertType: MarketplaceAlertType.CanonicalMergeBacklog,
      severity: MarketplaceAlertSeverity.Warning,
      subjectType: "marketplace",
      subjectId: null,
      title: `${pendingCount} merge candidate(s) pendentes de revisão`,
      detail: { pendingCount },
    },
  ];
}

export function healthScoreDroppedRule(
  previousScore: number | null,
  currentScore: number,
  dropThreshold = 10
): AlertRuleResult[] {
  if (previousScore === null) return [];
  const drop = previousScore - currentScore;
  if (drop < dropThreshold) return [];

  return [
    {
      alertType: MarketplaceAlertType.HealthScoreDropped,
      severity: drop >= 20 ? MarketplaceAlertSeverity.Critical : MarketplaceAlertSeverity.Warning,
      subjectType: "marketplace",
      subjectId: null,
      title: `Marketplace Health caiu ${drop} ponto(s) (${previousScore} → ${currentScore})`,
      detail: { previousScore, currentScore, drop },
    },
  ];
}

export function lowFreshnessRule(breakdown: MarketplaceHealthBreakdown, threshold = 40): AlertRuleResult[] {
  const freshness = breakdown.factors.find((f) => f.factor === MarketplaceHealthFactor.Freshness);
  if (!freshness || freshness.score >= threshold) return [];

  return [
    {
      alertType: MarketplaceAlertType.LowFreshness,
      severity: freshness.score < 20 ? MarketplaceAlertSeverity.Critical : MarketplaceAlertSeverity.Warning,
      subjectType: "marketplace",
      subjectId: null,
      title: `Frescor de sincronização baixo (${freshness.score}/100)`,
      detail: { score: freshness.score, detail: freshness.detail },
    },
  ];
}
