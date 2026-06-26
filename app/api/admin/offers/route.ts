import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("perPage") ?? 20));
  const productId = searchParams.get("productId");

  let query = auth.serviceClient
    .from("offers")
    .select("*, product:products(id,name,slug), store:stores(id,name,slug)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (productId) query = query.eq("product_id", productId);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count ?? 0, page, perPage, totalPages: Math.ceil((count ?? 0) / perPage) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const body = await request.json() as Record<string, unknown>;
  if (!body.product_id || !body.store_id) {
    return NextResponse.json({ error: "product_id e store_id são obrigatórios" }, { status: 400 });
  }
  const priceUSD = Number(body.price_usd);
  if (!priceUSD || priceUSD <= 0) {
    return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  }
  const { data, error } = await auth.serviceClient
    .from("offers")
    .insert({
      product_id: body.product_id,
      store_id: body.store_id,
      currency: String(body.currency ?? "USD"),
      price_usd: priceUSD,
      price_brl: body.price_brl ? Number(body.price_brl) : null,
      old_price: body.old_price ? Number(body.old_price) : null,
      in_stock: Boolean(body.in_stock),
      available: Boolean(body.available ?? body.in_stock),
      stock_quantity: body.stock_quantity ? Number(body.stock_quantity) : null,
      condition: body.condition ?? null,
      warranty: body.warranty ?? null,
      cashback: body.cashback ? Number(body.cashback) : null,
      product_url: body.product_url ?? null,
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Oferta criada" }, { status: 201 });
}
