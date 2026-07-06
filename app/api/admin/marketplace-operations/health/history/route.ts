import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

const MAX_DAYS = 90;

// Epic 2 — Marketplace Health Engine, trend view. Reads
// marketplace_health_snapshots (written daily by /api/cron/marketplace-operations/snapshot).
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const daysParam = Number(request.nextUrl.searchParams.get("days") ?? "30");
  const days = Number.isFinite(daysParam) ? Math.min(MAX_DAYS, Math.max(1, daysParam)) : 30;

  const { snapshotService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await snapshotService.getHistory(days);

  return NextResponse.json({ data });
}
