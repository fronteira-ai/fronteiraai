import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { exportStoreCatalogCsv } from "@/services/merchant-export.service";
import { logAuditEvent } from "@/services/merchant.service";

/**
 * Merchant Console — exportar catálogo CSV (§36/37).
 * Só permite exportar um store que a merchant possui (re-audit server-side).
 * O CSV é gerado com proteção contra injeção de fórmula (exportStoreCatalogCsv).
 */
export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const storeId = new URL(request.url).searchParams.get("store")?.trim() ?? "";
  if (!storeId) {
    return NextResponse.json({ error: "store é obrigatório" }, { status: 400 });
  }

  try {
    const csv = await exportStoreCatalogCsv(auth.serviceClient, auth.merchant.id, storeId);
    await logAuditEvent(auth.merchant.id, auth.userId, "export_downloaded", { store_id: storeId }, auth.serviceClient);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="catalogo-${storeId}.csv"`,
      },
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Loja não pertence à sua conta" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
