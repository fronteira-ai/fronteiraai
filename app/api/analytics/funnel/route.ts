import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createAnalyticsServices } from "@/lib/analytics-factory";
import { AnalyticsWindow } from "@/src/domains/merchant-analytics/types/enums";

const VALID_WINDOWS = new Set<string>(Object.values(AnalyticsWindow));

export async function GET(req: NextRequest) {
  const windowParam = req.nextUrl.searchParams.get("window") ?? AnalyticsWindow.Last7Days;
  const merchantId = req.nextUrl.searchParams.get("merchant_id") ?? undefined;

  if (!VALID_WINDOWS.has(windowParam)) {
    return NextResponse.json({ error: "invalid_window" }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();
  const { funnel } = createAnalyticsServices(serviceClient);

  const result = await funnel.getFunnel(windowParam as AnalyticsWindow, merchantId);
  return NextResponse.json(result);
}
