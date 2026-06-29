import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseMerchantReviewRepository,
  SupabaseReviewAuditRepository,
  SupabaseTrustEventRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { ReviewService } from "@/src/domains/trust/services";
import { requireAuth, isMerchantAuthError } from "@/lib/merchant-auth";

type Params = Promise<{ merchantId: string; reviewId: string }>;

function buildReviewService() {
  const client = getSupabaseServiceClient();
  return new ReviewService(
    new SupabaseMerchantReviewRepository(client),
    new SupabaseReviewAuditRepository(client),
    new SupabaseTrustEventRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { reviewId } = await params;
  const svc = buildReviewService();
  const review = await svc.getById(reviewId);
  if (!review) return NextResponse.json({ error: "Review não encontrado" }, { status: 404 });
  return NextResponse.json({ data: review });
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { reviewId } = await params;
  const body = await req.json();

  if (body.body && (body.body.length < 10 || body.body.length > 2000)) {
    return NextResponse.json({ error: "body deve ter entre 10 e 2000 caracteres" }, { status: 400 });
  }
  if (body.rating && (body.rating < 1 || body.rating > 5)) {
    return NextResponse.json({ error: "rating deve ser entre 1 e 5" }, { status: 400 });
  }

  const svc = buildReviewService();
  const updated = await svc.editReview(reviewId, auth.userId, {
    rating: body.rating,
    body: body.body,
    title: body.title,
  });

  if (!updated) {
    return NextResponse.json({ error: "Não foi possível editar. Verifique propriedade e status do review." }, { status: 403 });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { reviewId } = await params;
  const svc = buildReviewService();
  const deleted = await svc.softDeleteReview(reviewId, auth.userId);

  if (!deleted) {
    return NextResponse.json({ error: "Não foi possível remover review." }, { status: 403 });
  }

  return NextResponse.json({ data: { deleted: true } });
}
