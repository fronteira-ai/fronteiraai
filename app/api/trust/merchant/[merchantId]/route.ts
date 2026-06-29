import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseTrustRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustRepository";
import { SupabaseBadgeRepository } from "@/src/domains/trust/infrastructure/SupabaseBadgeRepository";
import { TrustService } from "@/src/domains/trust/services/TrustService";
import { BadgeService } from "@/src/domains/trust/services/BadgeService";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { toPublicTrustResponse } from "@/src/domains/trust/mappers/trust.mappers";

type Params = { params: Promise<{ merchantId: string }> };

/**
 * GET /api/trust/merchant/[merchantId]
 * Public endpoint — returns merchant trust status and active badge.
 * Service client used because merchant_trust RLS only allows reads of verified records for anon.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { merchantId } = await params;

  if (!merchantId) {
    return NextResponse.json({ error: "merchantId é obrigatório" }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  const trustRepo = new SupabaseTrustRepository(client);
  const badgeRepo = new SupabaseBadgeRepository(client);
  const eventRepo = new SupabaseTrustEventRepository(client);
  const trustService = new TrustService(trustRepo, eventRepo);
  const badgeService = new BadgeService(badgeRepo, trustRepo, eventRepo);

  const [trust, activeBadge] = await Promise.all([
    trustService.getMerchantTrust(merchantId),
    badgeService.getActiveBadge(merchantId),
  ]);

  if (!trust) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  return NextResponse.json({ data: toPublicTrustResponse(trust, activeBadge) });
}
