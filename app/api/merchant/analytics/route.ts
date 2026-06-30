import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createAnalyticsServices } from "@/lib/analytics-factory";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const VALID_WINDOWS = new Set<string>(Object.values(AnalyticsWindow));

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const windowParam = req.nextUrl.searchParams.get("window") ?? AnalyticsWindow.Last7Days;
  if (!VALID_WINDOWS.has(windowParam)) {
    return NextResponse.json({ error: "invalid_window" }, { status: 400 });
  }

  const { merchantAnalytics } = createAnalyticsServices(auth.serviceClient);
  const result = await merchantAnalytics.getSummary(auth.merchant.id, windowParam as AnalyticsWindow);
  return NextResponse.json(result);
}
