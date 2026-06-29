import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseReviewReportRepository } from "@/src/domains/trust/infrastructure";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

type Params = Promise<{ reviewId: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { reviewId } = await params;
  const client = getSupabaseServiceClient();
  const repo = new SupabaseReviewReportRepository(client);
  const reports = await repo.findByReviewId(reviewId);

  return NextResponse.json({ data: reports });
}
