import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createAnalyticsServices } from "@/lib/analytics-factory";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const VALID_WINDOWS = new Set<string>(Object.values(AnalyticsWindow));

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const windowParam = req.nextUrl.searchParams.get("window") ?? AnalyticsWindow.Last7Days;
  const limitParam = parseInt(req.nextUrl.searchParams.get("limit") ?? "50", 10);
  const limit = Math.min(Math.max(1, isNaN(limitParam) ? 50 : limitParam), 200);

  if (!VALID_WINDOWS.has(windowParam)) {
    return NextResponse.json({ error: "invalid_window" }, { status: 400 });
  }

  const { merchantAnalytics } = createAnalyticsServices(auth.serviceClient);
  const events = await merchantAnalytics.getRecentEvents(
    auth.merchant.id,
    windowParam as AnalyticsWindow,
    limit
  );
  return NextResponse.json({ events, total: events.length });
}
