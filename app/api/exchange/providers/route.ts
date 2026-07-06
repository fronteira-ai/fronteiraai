import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createExchangeServices } from "@/lib/exchange-factory";

// Trimmed fields only — no raw error text or response-time detail on a
// public route. That operational detail lives behind
// GET /api/admin/exchange/provider-runs (admin-guarded).
export async function GET() {
  const { healthService } = createExchangeServices(getSupabaseServiceClient());
  const snapshots = await healthService.getSnapshots();

  const data = snapshots.map((s) => ({
    id: s.providerId,
    name: s.providerName,
    status: s.status,
    lastSuccessAt: s.lastSuccessAt,
  }));

  return NextResponse.json({ data });
}
