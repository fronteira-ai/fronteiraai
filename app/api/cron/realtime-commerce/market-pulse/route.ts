import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

// Epic 6 — persists today's Market Pulse as a snapshot (upsert-by-date, same
// pattern as /api/cron/marketplace-operations/snapshot). Intended to run
// periodically through the day so the "today" numbers stay current, and one
// final time after midnight closes out the day's row.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { marketPulseService, pulseSnapshotRepo } = createRealtimeCommerceServices(client);

  const snapshot = await marketPulseService.computeToday();
  await pulseSnapshotRepo.save(snapshot);

  return NextResponse.json({ data: snapshot });
}
