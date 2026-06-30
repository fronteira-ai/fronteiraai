import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { getProductHealthList } from "@/src/domains/catalog-intelligence/services/ProductHealthService";
import { ProductHealthStatus } from "@/src/domains/catalog-intelligence/types/enums";
import type { CatalogProductsResponse } from "@/src/domains/catalog-intelligence/types";

const VALID_STATUSES = new Set<string>(Object.values(ProductHealthStatus));
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const sp = req.nextUrl.searchParams;
  const statusFilter = sp.get("status");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const limit = Math.min(parseInt(sp.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT, MAX_LIMIT);

  if (statusFilter && !VALID_STATUSES.has(statusFilter)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: storeRows } = await auth.serviceClient
    .from("stores")
    .select("id")
    .eq("merchant_id", auth.merchant.id);

  const storeIds = (storeRows ?? []).map((s: { id: string }) => s.id);
  const all = await getProductHealthList(storeIds, auth.serviceClient);

  const filtered = statusFilter
    ? all.filter((p) => p.status === statusFilter)
    : all;

  const offset = (page - 1) * limit;
  const paged = filtered.slice(offset, offset + limit);

  const response: CatalogProductsResponse = {
    merchant_id: auth.merchant.id,
    products: paged,
    total: filtered.length,
    page,
    limit,
    generated_at: new Date().toISOString(),
  };

  return NextResponse.json(response);
}
