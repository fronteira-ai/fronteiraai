import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { MerchantAuthorizationService } from "@/services/merchant-authorization.service";
import { canOnboardMerchant, type MerchantAuthorizationRecord } from "@/src/domains/merchant-feed/auth/MerchantAuthorization";
import { logAuditEvent } from "@/services/merchant.service";

/**
 * Merchant Console — registros de autorização (internal audit trail, §7).
 * GET : lista autorizações da merchant logada (tenant-scoped por merchant.id).
 * POST: registra/atualiza UMA autorização — chaveada a um store que a merchant
 *       possui (server-side via requireMerchant + merchant_stores). NÃO confia
 *       em store_id/merchant_id vindo do browser (§46).
 */
export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;
  const svc = new MerchantAuthorizationService(auth.serviceClient);
  const rows = await svc.listByMerchant(auth.merchant.id);
  return NextResponse.json({ data: rows });
}

export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;
  const { serviceClient } = auth;

  const body = (await request.json()) as Record<string, unknown>;
  const storeId = String(body.store_id ?? "").trim();
  const record = (body.record ?? {}) as Partial<MerchantAuthorizationRecord>;

  if (!storeId) {
    return NextResponse.json({ error: "store_id é obrigatório" }, { status: 400 });
  }

  // Re-audit de posse: a merchant deve possuir este store.
  const { data: link } = await serviceClient
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", auth.merchant.id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (!link) {
    return NextResponse.json({ error: "Loja não pertence à sua conta" }, { status: 403 });
  }

  // Validação estrita (não inventa consentimento): authorizedBy + date + url http(s) + ACTIVE.
  const candidate: MerchantAuthorizationRecord = {
    merchantSlug: body.store_slug ? String(body.store_slug) : "",
    authorizedBy: String(record.authorizedBy ?? "").trim(),
    authorizationDate: String(record.authorizationDate ?? ""),
    sourceUrl: String(record.sourceUrl ?? "").trim(),
    allowedUsage: Array.isArray(record.allowedUsage) ? record.allowedUsage.map(String) : ["display_offers"],
    contactReference: record.contactReference ? String(record.contactReference) : undefined,
    status: (record.status as MerchantAuthorizationRecord["status"]) ?? "PENDING_LEGAL",
    evidenceReference: record.evidenceReference ? String(record.evidenceReference) : undefined,
  };
  if (!candidate.authorizedBy || !candidate.sourceUrl || !candidate.authorizationDate) {
    return NextResponse.json({ error: "Campos obrigatórios: authorized_by, source_url, authorization_date" }, { status: 400 });
  }
  const isActive = canOnboardMerchant(candidate) || candidate.status === "PENDING_LEGAL";

  const svc = new MerchantAuthorizationService(serviceClient);
  const row = await svc.upsert({ ...candidate, merchantId: auth.merchant.id, storeId });
  await logAuditEvent(auth.merchant.id, auth.userId, "authorization_updated", { authorization_id: row.id, status: row.status }, serviceClient);
  return NextResponse.json({ data: row }, { status: isActive ? 201 : 201 });
}
