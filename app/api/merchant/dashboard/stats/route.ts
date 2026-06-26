import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import {
  getMerchantDashboardStats,
  computeMerchantScore,
  generateRecommendations,
  getMerchantLevel,
  computeNextStep,
  computeGoals,
} from "@/services/merchant.service";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const stats = await getMerchantDashboardStats(merchant.id, serviceClient);
  const score = await computeMerchantScore(merchant, stats);

  // Persist computed score
  await serviceClient
    .from("merchants")
    .update({ merchant_score: score.total })
    .eq("id", merchant.id);

  // Refresh recommendations
  await generateRecommendations(merchant.id, merchant, stats, serviceClient);

  // Fetch unread recommendations
  const { data: recs } = await serviceClient
    .from("merchant_recommendations")
    .select("*")
    .eq("merchant_id", merchant.id)
    .is("read_at", null)
    .order("priority")
    .limit(8);

  const mergedStats = { ...stats, merchantScore: score.total };
  const level = getMerchantLevel(score.total);
  const nextStep = computeNextStep(merchant, mergedStats);
  const goals = computeGoals(merchant, mergedStats);

  return NextResponse.json({
    data: {
      stats: mergedStats,
      scoreBreakdown: score,
      level,
      nextStep,
      goals,
      recommendations: recs ?? [],
      merchant: {
        id: merchant.id,
        company_name: merchant.company_name,
        plan: merchant.plan,
        status: merchant.status,
        onboarding_done: merchant.onboarding_done,
        verified_level: merchant.verified_level,
      },
    },
  });
}
