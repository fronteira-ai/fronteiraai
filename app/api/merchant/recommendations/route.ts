import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createDecisionServices } from "@/lib/decision-factory";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { contextBuilder, recommendationEngine, prioritization } =
    createDecisionServices(auth.serviceClient);

  const context = await contextBuilder.build(auth.merchant);
  const recommendations = recommendationEngine.generate(context);
  const sorted = prioritization.sort(recommendations);

  return NextResponse.json({ recommendations: sorted, total: sorted.length });
}
