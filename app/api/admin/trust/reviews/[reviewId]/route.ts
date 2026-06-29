import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseMerchantReviewRepository,
  SupabaseReviewReportRepository,
  SupabaseReviewAuditRepository,
  SupabaseTrustEventRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { ReviewModerationService } from "@/src/domains/trust/services";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import type { ModerationAction } from "@/src/domains/trust/services/ReviewModerationService";

type Params = Promise<{ reviewId: string }>;

const VALID_ACTIONS: ModerationAction[] = ["approve", "hide", "remove", "restore"];

function buildSvc() {
  const client = getSupabaseServiceClient();
  return new ReviewModerationService(
    new SupabaseMerchantReviewRepository(client),
    new SupabaseReviewReportRepository(client),
    new SupabaseReviewAuditRepository(client),
    new SupabaseTrustEventRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { reviewId } = await params;
  const body = await req.json();

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ error: "Ação inválida. Use: approve, hide, remove, restore" }, { status: 400 });
  }

  const svc = buildSvc();
  const updated = await svc.moderate(reviewId, auth.userId, body.action, body.reason);

  if (!updated) return NextResponse.json({ error: "Review não encontrado" }, { status: 404 });
  return NextResponse.json({ data: updated });
}
