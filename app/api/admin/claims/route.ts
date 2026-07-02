import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import { ClaimStatus } from "@/src/domains/merchant-ownership";

const VALID_STATUSES = new Set(Object.values(ClaimStatus));

// Epic F — Claim Review Center (real admin UI, confirmed with the CTO).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? ClaimStatus.AwaitingReview;
  if (!VALID_STATUSES.has(statusParam as ClaimStatus)) {
    return NextResponse.json({ error: `Status inválido. Esperado um de: ${[...VALID_STATUSES].join(", ")}` }, { status: 400 });
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 20) || 20, 100);
  const offset = Number(searchParams.get("offset") ?? 0) || 0;

  const { claimRepo } = createMerchantOwnershipServices(auth.serviceClient);
  const result = await claimRepo.findByStatus(statusParam as ClaimStatus, { limit, offset });

  return NextResponse.json({ data: result.items, total: result.total });
}
