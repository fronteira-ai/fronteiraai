import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseMerchantReviewRepository,
  SupabaseReviewAuditRepository,
  SupabaseTrustEventRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { ReviewService } from "@/src/domains/trust/services";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";

type Params = Promise<{ merchantId: string; reviewId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { reviewId } = await params;
  const body = await req.json();

  if (!body.reply || body.reply.trim().length < 5) {
    return NextResponse.json({ error: "Resposta muito curta (mínimo 5 caracteres)" }, { status: 400 });
  }
  if (body.reply.length > 2000) {
    return NextResponse.json({ error: "Resposta muito longa (máximo 2000 caracteres)" }, { status: 400 });
  }

  const client = getSupabaseServiceClient();
  const svc = new ReviewService(
    new SupabaseMerchantReviewRepository(client),
    new SupabaseReviewAuditRepository(client),
    new SupabaseTrustEventRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );

  const updated = await svc.addMerchantReply(reviewId, auth.userId, body.reply.trim());
  if (!updated) {
    return NextResponse.json({ error: "Não foi possível responder. Avaliação não encontrada ou não aprovada." }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
