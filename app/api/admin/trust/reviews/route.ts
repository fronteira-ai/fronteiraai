import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseMerchantReviewRepository } from "@/src/domains/trust/infrastructure";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const client = getSupabaseServiceClient();
  const reviewRepo = new SupabaseMerchantReviewRepository(client);
  const result = await reviewRepo.findByMerchantId("", { page, perPage, status: "pending" as never });

  return NextResponse.json({ data: result });
}
