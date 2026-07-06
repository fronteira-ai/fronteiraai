import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 6 — Marketplace Metrics.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { metricsService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await metricsService.snapshot();

  return NextResponse.json({ data });
}
