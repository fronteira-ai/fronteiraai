import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";

export async function GET() {
  const { healthService } = createExchangeServices(getSupabaseServiceClient());
  const snapshots = await healthService.getSnapshots();

  const healthScore =
    snapshots.length > 0 ? Math.round(snapshots.reduce((sum, s) => sum + s.healthScore, 0) / snapshots.length) : 100;
  const uptime =
    snapshots.length > 0 ? Math.round(snapshots.reduce((sum, s) => sum + s.uptime, 0) / snapshots.length) : 100;
  const responseTimes = snapshots.map((s) => s.avgResponseTimeMs).filter((t): t is number => t !== null);
  const avgResponseTimeMs =
    responseTimes.length > 0 ? Math.round(responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length) : null;

  return NextResponse.json({
    data: { healthScore, uptime, avgResponseTimeMs, generatedAt: new Date().toISOString() },
  });
}
