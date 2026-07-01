import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = (await request.json()) as Record<string, unknown>;
  const connectorId = String(body.connectorId ?? "").trim();
  const dryRun = Boolean(body.dryRun ?? true);
  const skipMedia = Boolean(body.skipMedia ?? false);

  if (!connectorId) return NextResponse.json({ error: "connectorId é obrigatório" }, { status: 400 });

  const { connectorRegistry, manualSyncTrigger } = createConnectorsServices(auth.serviceClient);

  let connector;
  try {
    connector = connectorRegistry.get(connectorId);
  } catch {
    return NextResponse.json({ error: `Connector "${connectorId}" não encontrado` }, { status: 404 });
  }

  // Admin/global runs have no merchantId — Brain events are not emitted on
  // this path (see RELEASE_1_7_EXECUTION_PLAN.md decision #5).
  const result = await manualSyncTrigger.trigger(connector, { dryRun, skipMedia, verbose: false });

  // import_logs is superseded — SyncOrchestrator already persists this run
  // into connector_sync_runs unconditionally. The former dual-write here was
  // removed in Wave 2 (see RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md).

  return NextResponse.json({ data: result });
}
