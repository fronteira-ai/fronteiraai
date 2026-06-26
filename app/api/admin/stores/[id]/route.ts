import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { slugify } from "@/utils/slug";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const { data, error } = await auth.serviceClient.from("stores").select("*").eq("id", id).single();
  if (error || !data) return NextResponse.json({ error: "Loja não encontrada" }, { status: 404 });
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
    .from("stores")
    .update({
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
    .eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Loja atualizada" });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { id } = await params;
  const { error } = await auth.serviceClient.from("stores").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Loja removida" });
}
