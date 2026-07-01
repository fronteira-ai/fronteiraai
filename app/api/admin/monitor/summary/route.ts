import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";

export interface ConnectorHealthSummary {
  connectorKey: string;
  name: string;
  status: string;
  storeSlug: string;
  lastSyncAt: string | null;
  lastStatus: string | null;
  errorRate: number;
}

// Ecosystem Monitor (Release 1.7 — Wave 2). Computed on read from
// connector_sync_runs — no new aggregate table, per this project's
// established "compute on-demand" philosophy (ADR-034).
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { connectorRepo, syncRunRepo } = createConnectorsServices(auth.serviceClient);

  const connectors = await connectorRepo.list();

  const perConnector: ConnectorHealthSummary[] = await Promise.all(
    connectors.map(async (c) => {
      const recent = await syncRunRepo.findByConnector(c.id, 20);
      const lastRun = recent[0] ?? null;
      const errorRate = recent.length > 0 ? recent.filter((r) => r.status === "failed").length / recent.length : 0;

      return {
        connectorKey: c.connectorKey,
        name: c.name,
        status: c.status,
        storeSlug: c.storeSlug,
        lastSyncAt: lastRun?.completedAt ?? lastRun?.startedAt ?? null,
        lastStatus: lastRun?.status ?? null,
        errorRate,
      };
    })
  );

  return NextResponse.json({ data: perConnector });
}
