import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { AcquisitionPipeline } from "@/acquisition/core/pipeline";
import { connectorRegistry } from "@/acquisition/core/registry";
import "@/acquisition/connectors/bootstrap";
import { logAuditEvent } from "@/services/merchant.service";

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient, userId } = auth;
  const body = await request.json() as Record<string, unknown>;

  const connectorId = String(body.connectorId ?? "").trim();
  const dryRun = Boolean(body.dryRun ?? true);
  const skipMedia = Boolean(body.skipMedia ?? false);

  if (!connectorId) {
    return NextResponse.json({ error: "connectorId é obrigatório" }, { status: 400 });
  }

  let connector;
  try {
    connector = connectorRegistry.get(connectorId);
  } catch {
    return NextResponse.json({ error: `Connector "${connectorId}" não encontrado` }, { status: 404 });
  }

  const batch = await connector.fetch();
  const pipeline = new AcquisitionPipeline();
  const result = await pipeline.run(connectorId, batch.items, serviceClient, {
    dryRun,
    skipMedia,
    verbose: false,
  });

  const persistedCount = result.persisted.filter(
    (p) => p.action === "created" || p.action === "updated"
  ).length;

  if (!dryRun) {
    await serviceClient.from("import_logs").insert({
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

  await logAuditEvent(
    merchant.id, userId,
    dryRun ? "import_run" : "import_complete",
    { connectorId, dryRun, persisted: persistedCount, errors: result.errors.length },
    serviceClient
  );

  return NextResponse.json({ data: result });
}
