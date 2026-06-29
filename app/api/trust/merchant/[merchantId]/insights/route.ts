import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseTrustRepository,
  SupabaseVerificationRepository,
  SupabaseTrustSignalRepository,
  SupabaseMerchantReviewRepository,
  SupabaseBadgeRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { MerchantPassportService } from "@/src/domains/trust/services";

type Params = Promise<{ merchantId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const client = getSupabaseServiceClient();

  const { data: merchant } = await client
    .from("merchants")
    .select("user_id, created_at, updated_at, status")
    .eq("user_id", merchantId)
    .eq("status", "active")
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant não encontrado" }, { status: 404 });
  }

  const svc = new MerchantPassportService(
    new SupabaseTrustRepository(client),
    new SupabaseVerificationRepository(client),
    new SupabaseBadgeRepository(client),
    new SupabaseTrustSignalRepository(client),
    new SupabaseMerchantReviewRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );

  const insights = await svc.getInsights(
    merchantId,
    merchant.created_at as string,
    merchant.updated_at as string
  );

  if (!insights) return NextResponse.json({ error: "Insights não disponíveis" }, { status: 404 });

  return NextResponse.json({ data: insights });
}
