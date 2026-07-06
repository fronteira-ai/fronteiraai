import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";
import type { ConnectorHealthSummary } from "@/src/domains/connectors/services/ConnectorHealthService";

export type { ConnectorHealthSummary };

// Ecosystem Monitor (Release 1.7 — Wave 2). Delegates the per-connector
// health computation to ConnectorHealthService (Release 1.8 — Program 0 —
// Wave 1, Epic 5) instead of inlining it — one implementation, reused by
// both this route and the Marketplace Operations dashboard.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { healthService } = createConnectorsServices(auth.serviceClient);
  const perConnector = await healthService.getSummaries();

  return NextResponse.json({ data: perConnector });
}
