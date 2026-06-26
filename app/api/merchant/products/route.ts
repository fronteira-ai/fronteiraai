import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";

export async function GET(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const limit = 20;
  const offset = (page - 1) * limit;

  const { data: storeLinks } = await serviceClient
    .from("merchant_stores")
    .select("store_id")
    .eq("merchant_id", merchant.id);

  const storeIds = (storeLinks ?? []).map((s: { store_id: string }) => s.store_id);

  if (storeIds.length === 0) {
    return NextResponse.json({ data: [], totalPages: 0 });
  }

  const { data, count } = await serviceClient
    .from("offers")
    .select(
      "id, price_usd, in_stock, product_url, products!inner(id, name, slug, image_url, brand_id, category_id, brands(name), categories(name))",
      { count: "exact" }
    )
    .in("store_id", storeIds)
    .order("id")
    .range(offset, offset + limit - 1);

  return NextResponse.json({
    data: data ?? [],
    totalPages: Math.ceil((count ?? 0) / limit),
    total: count ?? 0,
  });
}
