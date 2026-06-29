import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseMerchantReviewRepository,
  SupabaseReviewReportRepository,
  SupabaseReviewAuditRepository,
  SupabaseTrustEventRepository,
} from "@/src/domains/trust/infrastructure";
import { ReviewModerationService } from "@/src/domains/trust/services";
import { requireAuth, isMerchantAuthError } from "@/lib/merchant-auth";
import type { ReviewReportReason } from "@/src/domains/trust/types/enums";

type Params = Promise<{ merchantId: string; reviewId: string }>;

const VALID_REASONS: ReviewReportReason[] = [
  "spam", "fake", "offensive", "irrelevant", "conflict_of_interest", "other",
] as ReviewReportReason[];

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { reviewId } = await params;
  const body = await req.json();

  if (!body.reason || !VALID_REASONS.includes(body.reason)) {
    return NextResponse.json({ error: "Motivo inválido" }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  const svc = new ReviewModerationService(
    new SupabaseMerchantReviewRepository(client),
    new SupabaseReviewReportRepository(client),
    new SupabaseReviewAuditRepository(client),
    new SupabaseTrustEventRepository(client)
  );

  const report = await svc.reportReview(
    reviewId,
    auth.userId,
    body.reason,
    body.description
  );

  if (!report) {
    return NextResponse.json({ error: "Não foi possível enviar denúncia. Você já denunciou este review." }, { status: 409 });
  }

  return NextResponse.json({ data: report }, { status: 201 });
}
