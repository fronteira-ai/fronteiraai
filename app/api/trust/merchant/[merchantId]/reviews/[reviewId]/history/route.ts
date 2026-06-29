import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseReviewAuditRepository } from "@/src/domains/trust/infrastructure";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

type Params = Promise<{ merchantId: string; reviewId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { reviewId } = await params;
  const client = getSupabaseServiceClient();
  const repo = new SupabaseReviewAuditRepository(client);
  const history = await repo.findByReviewId(reviewId);

  return NextResponse.json({ data: history });
}
