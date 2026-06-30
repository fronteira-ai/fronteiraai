import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createGrowthEngineServices } from "@/lib/growth-engine-factory";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { contextBuilder, recommendationEngine, priorityEngine, opportunityCenter } =
    createGrowthEngineServices(auth.serviceClient);

  const ctx = await contextBuilder.build(auth.merchant);
  const drafts = recommendationEngine.evaluate(ctx);
  const scored = priorityEngine.scoreAll(drafts, ctx);
  const center = opportunityCenter.buildCenter(scored, auth.merchant.id);

  return NextResponse.json({ ok: true, data: center });
}
