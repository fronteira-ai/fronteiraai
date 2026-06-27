import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import {
  getMerchantDashboardStats,
  computeMerchantScore,
  generateRecommendations,
  getMerchantLevel,
  computeNextStep,
  computeGoals,
  computeProfileCompletion,
} from "@/services/merchant.service";

export async function GET() {
  try {
    const auth = await requireMerchant();
    if (isMerchantAuthError(auth)) return auth;

    const { merchant, serviceClient } = auth;
    const stats = await getMerchantDashboardStats(merchant.id, serviceClient);
    const score = await computeMerchantScore(merchant, stats);

    // Persist computed score (best-effort)
    const { error: scoreErr } = await serviceClient
      .from("merchants")
      .update({ merchant_score: score.total })
      .eq("id", merchant.id);
    if (scoreErr) console.error("[stats] score update:", scoreErr.message);

    // Refresh recommendations (best-effort)
    await generateRecommendations(merchant.id, merchant, stats, serviceClient);

    const { data: recs, error: recsErr } = await serviceClient
      .from("merchant_recommendations")
      .select("*")
      .eq("merchant_id", merchant.id)
      .is("read_at", null)
      .order("priority")
      .limit(8);
    if (recsErr) console.error("[stats] recs select:", recsErr.message);

    const mergedStats = { ...stats, merchantScore: score.total };
    const level = getMerchantLevel(score.total);
    const nextStep = computeNextStep(merchant, mergedStats);
    const goals = computeGoals(merchant, mergedStats);
    const profileCompletion = computeProfileCompletion(merchant, mergedStats);

    return NextResponse.json({
      data: {
        stats: mergedStats,
        scoreBreakdown: score,
        level,
        nextStep,
        goals,
        profileCompletion,
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[stats] unhandled:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
