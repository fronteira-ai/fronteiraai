import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 5 — Connector Health Engine. Same ConnectorHealthService already
// used by /api/admin/monitor/summary — one implementation, two consumers.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { connectorHealthService } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await connectorHealthService.getSummaries();

  return NextResponse.json({ data });
}
