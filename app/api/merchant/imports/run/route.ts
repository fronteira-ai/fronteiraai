import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createConnectorsServices } from "@/lib/connectors-factory";
import { logAuditEvent, merchantOwnsStoreSlug, checkImportEntitlement } from "@/services/merchant.service";
import { connectorSyncSkippedEntitlementEvent } from "@/src/domains/connectors/events/connector.events";

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient, userId } = auth;
  const body = (await request.json()) as Record<string, unknown>;

  const connectorId = String(body.connectorId ?? "").trim();
  const dryRun = Boolean(body.dryRun ?? true);
  const skipMedia = Boolean(body.skipMedia ?? false);

  if (!connectorId) {
    return NextResponse.json({ error: "connectorId é obrigatório" }, { status: 400 });
  }

  const { connectorRegistry, manualSyncTrigger, eventService } = createConnectorsServices(serviceClient);

  let connector;
  try {
    connector = connectorRegistry.get(connectorId);
  } catch {
    return NextResponse.json({ error: `Connector "${connectorId}" não encontrado` }, { status: 404 });
  }

  // Release 1.7 — Wave 2: closes the authorization gap left open in Epic 1
  // (// TODO(Epic 2)) — a merchant may only sync connectors tied to a store
  // it owns via merchant_stores.
  const owns = await merchantOwnsStoreSlug(merchant.id, connector.metadata.storeSlug, serviceClient);
  if (!owns) {
    return NextResponse.json(
      { error: "Você não tem permissão para sincronizar esta loja" },
      { status: 403 }
    );
  }

  const entitlement = await checkImportEntitlement(merchant.id, merchant.plan, serviceClient);
  if (!entitlement.allowed) {
    const event = connectorSyncSkippedEntitlementEvent(merchant.id, connectorId, entitlement.reason ?? "");
    await eventService.recordEvent({
      merchant_id: event.merchantId,
      event_type: event.eventType,
      source: event.source,
      metadata: event.metadata,
    });
    return NextResponse.json({ error: entitlement.reason }, { status: 403 });
  }

  const result = await manualSyncTrigger.trigger(connector, {
    dryRun,
    skipMedia,
    verbose: false,
    merchantId: merchant.id,
  });

  const persistedCount = result.persisted.filter(
    (p) => p.action === "created" || p.action === "updated"
  ).length;

  // import_logs is superseded — SyncOrchestrator already persists this run into
  // connector_sync_runs unconditionally. The former dual-write here was
  // removed in Wave 2 (see RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md).

  await logAuditEvent(
    merchant.id, userId,
    dryRun ? "import_run" : "import_complete",
    { connectorId, dryRun, persisted: persistedCount, errors: result.errors.length },
    serviceClient
  );

  return NextResponse.json({ data: result });
}
