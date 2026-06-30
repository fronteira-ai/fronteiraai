import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createGrowthEngineServices } from "@/lib/growth-engine-factory";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Math.min(isNaN(rawLimit) ? DEFAULT_LIMIT : rawLimit, MAX_LIMIT);

  const { history } = createGrowthEngineServices(auth.serviceClient);
  const timeline = await history.getTimeline(auth.merchant.id, limit);

  return NextResponse.json({ ok: true, data: timeline });
}
