import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseTrustRepository,
  SupabaseBadgeRepository,
  SupabaseTrustSignalRepository,
  SupabaseMerchantReviewRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { MerchantProfileService } from "@/src/domains/trust/services";

type Params = Promise<{ merchantId: string }>;

function buildServices() {
  const client = getSupabaseServiceClient();
  return new MerchantProfileService(
    new SupabaseTrustRepository(client),
    new SupabaseBadgeRepository(client),
    new SupabaseTrustSignalRepository(client),
    new SupabaseMerchantReviewRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const svc = buildServices();
  const profile = await svc.getPublicProfile(merchantId);
  if (!profile) return NextResponse.json({ error: "Merchant não encontrado" }, { status: 404 });
  return NextResponse.json({ data: profile });
}
