import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createGrowthEngineServices } from "@/lib/growth-engine-factory";
import { GrowthPriority } from "@/src/domains/growth-engine/types/enums";

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const priorityFilter = searchParams.get("priority") as GrowthPriority | null;

  const { contextBuilder, recommendationEngine, priorityEngine } =
    createGrowthEngineServices(auth.serviceClient);

  const ctx = await contextBuilder.build(auth.merchant);
  const drafts = recommendationEngine.evaluate(ctx);
  let scored = priorityEngine.scoreAll(drafts, ctx);

  if (priorityFilter && Object.values(GrowthPriority).includes(priorityFilter)) {
    scored = scored.filter((r) => r.priority === priorityFilter);
  }

  return NextResponse.json({
    ok: true,
    data: scored,
    total: scored.length,
    generated_at: new Date().toISOString(),
  });
}
