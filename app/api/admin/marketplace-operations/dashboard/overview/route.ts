import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 7 — Marketplace Operations Dashboard (composition). Promise.allSettled
// isolation — one failing sub-service never breaks the whole payload, see
// MarketplaceOperationsDashboardService's doc comment.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { dashboardService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await dashboardService.overview();

  return NextResponse.json({ data });
}
