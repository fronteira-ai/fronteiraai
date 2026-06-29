import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";

type Params = { merchantId: string; verificationId: string };

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { verificationId } = await params;

  const adminAuth = await requireAdmin();
  if (isAuthError(adminAuth)) return adminAuth as NextResponse;

  const repo = new SupabaseVerificationHistoryRepository(getSupabaseServiceClient());
  const history = await repo.findByVerificationId(verificationId);

  return NextResponse.json({ data: history });
}
