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

type Params = Promise<{ merchantId: string }>;

function buildReviewService() {
  const client = getSupabaseServiceClient();
  return new ReviewService(
    new SupabaseMerchantReviewRepository(client),
    new SupabaseReviewAuditRepository(client),
    new SupabaseTrustEventRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "10");

  const svc = buildReviewService();
  const result = await svc.getApprovedReviews(merchantId, { page, perPage });
  const stats = await svc.getStats(merchantId);

  return NextResponse.json({ data: { reviews: result, stats } });
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { merchantId } = await params;
  const body = await req.json();

  if (!body.rating || !body.body) {
    return NextResponse.json({ error: "rating e body são obrigatórios" }, { status: 400 });
  }
  if (body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ error: "rating deve ser entre 1 e 5" }, { status: 400 });
  }
  if (body.body.length < 10 || body.body.length > 2000) {
    return NextResponse.json({ error: "body deve ter entre 10 e 2000 caracteres" }, { status: 400 });
  }

  const svc = buildReviewService();
  const review = await svc.submitReview(merchantId, auth.userId, {
    rating: body.rating,
    body: body.body,
    title: body.title,
  });

  if (!review) {
    return NextResponse.json({ error: "Não foi possível criar avaliação. Você já avaliou este merchant." }, { status: 409 });
  }

  return NextResponse.json({ data: review }, { status: 201 });
}
