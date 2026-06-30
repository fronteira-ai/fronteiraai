import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createCatalogIntelligenceServices } from "@/lib/catalog-intelligence-factory";
import { getProductHealthList, getHealthBreakdown } from "@/src/domains/catalog-intelligence/services/ProductHealthService";
import type { CatalogHealthResponse } from "@/src/domains/catalog-intelligence/types";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { data: storeRows } = await auth.serviceClient
    .from("stores")
    .select("id")
    .eq("merchant_id", auth.merchant.id);

  const storeIds = (storeRows ?? []).map((s: { id: string }) => s.id);

  const products = await getProductHealthList(storeIds, auth.serviceClient);
  const breakdown = getHealthBreakdown(products);

  // Record today's snapshot (fire-and-forget — never block the response)
  const { catalogHistory } = createCatalogIntelligenceServices(auth.serviceClient);
  catalogHistory.recordSnapshot(auth.merchant.id, breakdown).catch(() => undefined);

  const products_needing_attention = products
    .filter((p) => p.status !== "ideal")
    .slice(0, 20);

  const response: CatalogHealthResponse = {
    merchant_id: auth.merchant.id,
    breakdown,
    products_needing_attention,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
