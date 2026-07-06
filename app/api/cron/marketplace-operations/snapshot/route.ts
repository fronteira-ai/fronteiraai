import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";
import * as AlertRules from "@/src/domains/marketplace-operations/services/AlertRules";

// Daily Marketplace Health + Metrics snapshot, and Alert rule sweep (Epics
// 2, 6, 8). Triggered by vercel.json's cron entry, same shared-secret auth
// as /api/cron/connectors/sync (Release 1.7 — Wave 2).
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { healthEngine, metricsService, coverageService, connectorHealthService, alertService, snapshotService } =
    createMarketplaceOperationsServices(client);

  const [previousScore, health, metrics, coverage, connectorSummaries] = await Promise.all([
    snapshotService.getPreviousScore(),
    healthEngine.compute(),
    metricsService.snapshot(),
    coverageService.compute(),
    connectorHealthService.getSummaries(),
  ]);

  await snapshotService.recordDaily(health, metrics);

  const [lastDiscoveredRes, pendingClaimsRes, pendingMergesRes] = await Promise.all([
    client
      .from("stores")
      .select("discovered_at")
      .not("discovered_at", "is", null)
      .order("discovered_at", { ascending: false })
      .limit(1),
    client.from("store_claims").select("id", { count: "exact", head: true }).in("status", ["pending", "awaiting_review"]),
    client.from("merge_candidates").select("id", { count: "exact", head: true }).eq("status", "pending"),
  ]);

  const lastDiscoveredAt =
    (lastDiscoveredRes.data?.[0] as { discovered_at: string } | undefined)?.discovered_at ?? null;

  const ruleResults = [
    ...AlertRules.connectorDownRule(connectorSummaries),
    ...AlertRules.storeNotSyncingRule(connectorSummaries),
    ...AlertRules.lowCoverageRule(coverage.gaps),
    ...AlertRules.discoveryStalledRule(lastDiscoveredAt),
    ...AlertRules.claimPendingRule(pendingClaimsRes.count ?? 0),
    ...AlertRules.canonicalMergeBacklogRule(pendingMergesRes.count ?? 0),
    ...AlertRules.healthScoreDroppedRule(previousScore, health.overallScore),
    ...AlertRules.lowFreshnessRule(health),
  ];

  const createdAlerts = await alertService.sync(ruleResults);

  return NextResponse.json({
    data: {
      overallScore: health.overallScore,
      previousScore,
      alertsCreated: createdAlerts.length,
    },
  });
}
