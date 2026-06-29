import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { SupabaseTrustHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustHistoryRepository";
import { SupabaseTrustRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { TrustHistoryService } from "@/src/domains/trust/services/TrustHistoryService";

type Params = { params: Promise<{ merchantId: string }> };

/**
 * GET /api/trust/merchant/[merchantId]/history
 * Admin only — trust history snapshots are strategic data.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const limit = Math.min(90, Number(searchParams.get("limit") ?? 30));

  const historyRepo = new SupabaseTrustHistoryRepository(auth.serviceClient);
  const trustRepo = new SupabaseTrustRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const verificationRepo = new SupabaseVerificationRepository(auth.serviceClient);
  const historyService = new TrustHistoryService(historyRepo, trustRepo, eventRepo, verificationRepo);

  const history = await historyService.getMerchantHistory(merchantId, limit);

  return NextResponse.json({
    data: {
      merchantId,
      snapshots: history.map((h) => ({
        date: h.snapshot_date,
        score: h.trust_score,
        status: h.status,
        badgeLevel: h.badge_level,
        eventCount: h.event_count,
      })),
    },
  });
}
