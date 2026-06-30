import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createDecisionServices } from "@/lib/decision-factory";
import { ActionStatus } from "@/src/domains/merchant-decision/types/enums";
import type { DecisionCenterData } from "@/src/domains/merchant-decision/types";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { contextBuilder, recommendationEngine, prioritization, opportunityDetector, actionService } =
    createDecisionServices(auth.serviceClient);

  const [context, pendingActions, completedActions] = await Promise.all([
    contextBuilder.build(auth.merchant),
    actionService.getActions(auth.merchant.id, ActionStatus.Pending),
    actionService.getTimeline(auth.merchant.id, 10),
  ]);

  const allRecommendations = recommendationEngine.generate(context);
  const sorted = prioritization.sort(allRecommendations);
  const todays = prioritization.todaysPriorities(allRecommendations, 5);
  const opportunities = opportunityDetector.detect(context);

  const data: DecisionCenterData = {
    merchant_id: auth.merchant.id,
    todays_priorities: todays,
    all_recommendations: sorted,
    opportunities,
    pending_actions: pendingActions,
    completed_actions: completedActions,
    total_recommendations: sorted.length,
    total_opportunities: opportunities.length,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json({ ok: true, data });
}
