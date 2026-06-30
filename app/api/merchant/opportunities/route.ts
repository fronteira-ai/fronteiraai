import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createDecisionServices } from "@/lib/decision-factory";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { contextBuilder, opportunityDetector } = createDecisionServices(auth.serviceClient);

  const context = await contextBuilder.build(auth.merchant);
  const opportunities = opportunityDetector.detect(context);

  return NextResponse.json({ opportunities, total: opportunities.length });
}
