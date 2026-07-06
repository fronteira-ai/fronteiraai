import { NextRequest, NextResponse } from "next/server";
import { requireCronSecret } from "@/lib/cron-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

// Epic 8 — Buyer Alert Engine foundation. Classifies recent market_changes
// into buyer_alert_candidates (status='pending' only). No delivery mechanism
// exists this Wave — this cron populates the model/pipeline, nothing more.
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const client = getSupabaseServiceClient();
  const { buyerAlertService } = createRealtimeCommerceServices(client);

  const created = await buyerAlertService.generateFromRecentChanges();

  return NextResponse.json({ data: { candidatesCreated: created } });
}
