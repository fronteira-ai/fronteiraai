import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const { data, error } = await auth.serviceClient
    .from("offers")
    .select("*, product:products(id,name,slug), store:stores(id,name,slug)")
    .eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Oferta não encontrada" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const priceUSD = Number(body.price_usd);
  if (!priceUSD || priceUSD <= 0) return NextResponse.json({ error: "Preço inválido" }, { status: 400 });
  const { data, error } = await auth.serviceClient
    .from("offers")
    .update({
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
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Oferta atualizada" });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const { error } = await auth.serviceClient.from("offers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Oferta removida" });
}
