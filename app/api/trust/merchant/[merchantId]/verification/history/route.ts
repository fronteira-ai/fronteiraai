import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ merchantId: string }> }
): Promise<NextResponse> {
  const { merchantId } = await params;

  const merchantAuth = await requireMerchant();
  const adminAuth = await requireAdmin();

  const isAdmin = !isAuthError(adminAuth);
  const isMerchant = !isMerchantAuthError(merchantAuth);

  if (!isMerchant && !isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  if (isMerchant && !isAdmin) {
    const auth = merchantAuth as { merchant: { id: string } };
    if (auth.merchant?.id !== merchantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  }

  const repo = new SupabaseVerificationHistoryRepository(getSupabaseServiceClient());
  const history = await repo.findByMerchantId(merchantId);

  return NextResponse.json({ data: history });
}
