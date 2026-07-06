import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 3 — Merchant Priority Engine. Compute-on-read (no snapshot table —
// see MerchantPriorityService's doc comment).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { priorityService } = createMarketplaceOperationsServices(auth.serviceClient);
  const all = await priorityService.listAll();

  const storeId = request.nextUrl.searchParams.get("storeId");
  const data = storeId ? all.filter((s) => s.storeId === storeId) : all;

  return NextResponse.json({ data });
}
