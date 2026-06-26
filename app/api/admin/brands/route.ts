import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { slugify } from "@/utils/slug";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const { data, error } = await auth.serviceClient.from("brands").select("*").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;
  const body = await request.json() as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
  const slug = body.slug ? String(body.slug).trim() : slugify(name);
  const { data, error } = await auth.serviceClient
    .from("brands").insert({ name, slug, logo_url: body.logo_url ?? null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data, message: "Marca criada" }, { status: 201 });
}
