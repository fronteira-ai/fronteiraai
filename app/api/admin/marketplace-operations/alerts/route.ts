import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";
import { MarketplaceAlertStatus } from "@/src/domains/marketplace-operations/types/enums";

const VALID_STATUSES = new Set(Object.values(MarketplaceAlertStatus));

// Epic 8 — Marketplace Alert Engine. Lists persisted alerts (created by
// /api/cron/marketplace-operations/snapshot's rule sweep, not computed here).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const statusParam = request.nextUrl.searchParams.get("status");
  const status =
    statusParam && VALID_STATUSES.has(statusParam as MarketplaceAlertStatus)
      ? (statusParam as MarketplaceAlertStatus)
      : undefined;

  const { alertService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await alertService.list(status);

  return NextResponse.json({ data });
}
