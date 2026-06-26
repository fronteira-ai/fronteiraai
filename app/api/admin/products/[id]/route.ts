import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { slugify } from "@/utils/slug";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { data, error } = await auth.serviceClient
    .from("products")
    .select("*, brand:brands(*), category:categories(*)")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const slug = body.slug ? String(body.slug).trim() : slugify(name);

  const { data, error } = await auth.serviceClient
    .from("products")
    .update({
      name,
      slug,
      description: String(body.description ?? ""),
      brand_id: body.brand_id ?? null,
      category_id: body.category_id ?? null,
      image_url: body.image_url ?? null,
      specifications: body.specifications ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Produto atualizado com sucesso" });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;

  const { error } = await auth.serviceClient.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Produto removido com sucesso" });
}
