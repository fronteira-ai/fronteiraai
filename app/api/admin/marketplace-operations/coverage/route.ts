import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 4 — Marketplace Coverage Engine (trimmed scope — see
// MarketplaceCoverageService's doc comment for what's deliberately absent).
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { coverageService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await coverageService.compute();

  return NextResponse.json({ data });
}
