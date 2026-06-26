import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { slugify } from "@/utils/slug";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("perPage") ?? 20));
  const search = searchParams.get("search")?.trim() ?? "";

  const db = auth.serviceClient;
  let query = db
    .from("products")
    .select("*, brand:brands(id,name), category:categories(id,name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (search) query = query.ilike("name", `%${search}%`);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    data,
    total: count ?? 0,
    page,
    perPage,
    totalPages: Math.ceil((count ?? 0) / perPage),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });

  const slug = body.slug ? String(body.slug).trim() : slugify(name);
  if (!slug) return NextResponse.json({ error: "Slug inválido" }, { status: 400 });

  const { data, error } = await auth.serviceClient
    .from("products")
    .insert({
      name,
      slug,
      description: String(body.description ?? ""),
      brand_id: body.brand_id ?? null,
      category_id: body.category_id ?? null,
      image_url: body.image_url ?? null,
      specifications: body.specifications ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Produto criado com sucesso" }, { status: 201 });
}
