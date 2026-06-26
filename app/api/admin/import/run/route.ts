import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { AcquisitionPipeline } from "@/acquisition/core/pipeline";
import { connectorRegistry } from "@/acquisition/core/registry";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await request.json() as Record<string, unknown>;
  const connectorId = String(body.connectorId ?? "").trim();
  const dryRun = Boolean(body.dryRun ?? true);
  const skipMedia = Boolean(body.skipMedia ?? false);

  if (!connectorId) return NextResponse.json({ error: "connectorId é obrigatório" }, { status: 400 });

  const connector = connectorRegistry.get(connectorId);
  if (!connector) {
    return NextResponse.json({ error: `Connector "${connectorId}" não encontrado` }, { status: 404 });
  }

  const batch = await connector.fetch();
  const pipeline = new AcquisitionPipeline();
  const result = await pipeline.run(connectorId, batch.items, auth.serviceClient, {
    dryRun,
    skipMedia,
    verbose: false,
  });

  const persistedCount = result.persisted.filter((p) => p.action === "created" || p.action === "updated").length;
  if (!dryRun && persistedCount > 0) {
    await auth.serviceClient.from("import_logs").insert({
      connector_id: connectorId,
      batch_id: result.batchId,
      dry_run: false,
      success: result.success,
      total_raw: result.metrics.totals.validated,
      total_persisted: persistedCount,
      total_errors: result.errors.length,
      metrics: result.metrics,
      errors: result.errors.length > 0 ? result.errors : null,
    });
  }

  return NextResponse.json({ data: result });
}
