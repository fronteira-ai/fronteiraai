import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createAnalyticsServices } from "@/lib/analytics-factory";

export async function GET() {
  const serviceClient = getSupabaseServiceClient();
  const { observability } = createAnalyticsServices(serviceClient);

  const result = await observability.healthCheck();
  const status = result.status === "healthy" ? 200 : result.status === "degraded" ? 200 : 503;
  return NextResponse.json(result, { status });
}
