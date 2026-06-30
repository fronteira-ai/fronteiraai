import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createCatalogIntelligenceServices } from "@/lib/catalog-intelligence-factory";

const MAX_DAYS = 90;

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const daysParam = req.nextUrl.searchParams.get("days");
  const days = Math.min(
    daysParam ? Math.max(1, parseInt(daysParam, 10) || 30) : 30,
    MAX_DAYS
  );

  const { catalogHistory } = createCatalogIntelligenceServices(auth.serviceClient);
  const history = await catalogHistory.getHistory(auth.merchant.id, days);

  return NextResponse.json(history);
}
