import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createGrowthEngineServices } from "@/lib/growth-engine-factory";
import type { GrowthDashboard } from "@/src/domains/growth-engine/types/growth.types";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { contextBuilder, recommendationEngine, priorityEngine, todaysPlan, opportunityCenter, history } =
    createGrowthEngineServices(auth.serviceClient);

  const [ctx, timeline] = await Promise.all([
    contextBuilder.build(auth.merchant),
    history.getTimeline(auth.merchant.id, 20),
  ]);

  const drafts = recommendationEngine.evaluate(ctx);
  const scored = priorityEngine.scoreAll(drafts, ctx);

  const data: GrowthDashboard = {
    merchant_id: auth.merchant.id,
    todays_plan: todaysPlan.buildPlan(scored, auth.merchant.id),
    opportunities: opportunityCenter.buildCenter(scored, auth.merchant.id),
    all_recommendations: scored,
    recent_history: timeline.entries,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json({ ok: true, data });
}
