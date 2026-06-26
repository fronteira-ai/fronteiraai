import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { slugify } from "@/utils/slug";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const perPage = Math.min(50, Number(searchParams.get("perPage") ?? 20));
  const { data, error, count } = await auth.serviceClient
    .from("stores")
    .select("*", { count: "exact" })
    .order("name")
    .range((page - 1) * perPage, page * perPage - 1);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data, total: count ?? 0, page, perPage, totalPages: Math.ceil((count ?? 0) / perPage) });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  const slug = body.slug ? String(body.slug).trim() : slugify(name);
  const { data, error } = await auth.serviceClient
    .from("stores")
    .insert({
      name, slug,
      description: String(body.description ?? ""),
      city: String(body.city ?? "Ciudad del Este"),
      country: String(body.country ?? "PY"),
      rating: Number(body.rating ?? 0),
      logo_url: body.logo_url ?? null,
      cover_image: body.cover_image ?? null,
      is_verified: Boolean(body.is_verified),
      phone: body.phone ?? null,
      whatsapp: body.whatsapp ?? null,
      email: body.email ?? null,
      website: body.website ?? null,
      address: body.address ?? null,
      active: body.active !== false,
    })
    .select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Loja criada" }, { status: 201 });
}
