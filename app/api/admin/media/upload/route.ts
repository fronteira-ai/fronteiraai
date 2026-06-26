import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const folder = String(formData.get("folder") ?? "uploads");

  if (!file) return NextResponse.json({ error: "Arquivo não enviado" }, { status: 400 });
  if (file.size > MAX_SIZE) return NextResponse.json({ error: "Arquivo maior que 5MB" }, { status: 400 });

  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Tipo não suportado. Use JPEG, PNG, WebP ou GIF." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() ?? "jpg";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { data, error } = await auth.serviceClient.storage
    .from("catalog")
    .upload(filename, buffer, { contentType: file.type, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: publicData } = auth.serviceClient.storage.from("catalog").getPublicUrl(data.path);
  return NextResponse.json({ url: publicData.publicUrl, path: data.path }, { status: 201 });
}
