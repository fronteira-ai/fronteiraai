import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { buildCatalogIntelligence } from "@/src/domains/merchant-intelligence/services";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  try {
    const storeLinks = await serviceClient
      .from("merchant_stores")
      .select("store_id")
      .eq("merchant_id", merchant.id);

    const storeIds = ((storeLinks.data ?? []) as { store_id: string }[]).map((s) => s.store_id);
    const catalog = await buildCatalogIntelligence(merchant.id, storeIds, serviceClient);

    return NextResponse.json({ ok: true, data: catalog }, { status: 200 });
  } catch (err) {
    console.error("[command-center/catalog] error:", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
