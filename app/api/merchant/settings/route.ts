import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { logAuditEvent } from "@/services/merchant.service";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  const { data: plan } = await serviceClient
    .from("merchant_plans")
    .select("*")
    .eq("plan", merchant.plan)
    .single();

  return NextResponse.json({ data: { merchant, plan } });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient, userId } = auth;
  const body = await request.json() as Record<string, unknown>;

  const allowed = [
    "company_name", "company_doc", "company_website",
    "contact_phone", "contact_whatsapp", "contact_email",
  ];

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nenhum campo válido para atualizar" }, { status: 400 });
  }

  const { error } = await serviceClient
    .from("merchants")
    .update(update)
    .eq("id", merchant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logAuditEvent(merchant.id, userId, "settings_updated", update, serviceClient);

  return NextResponse.json({ data: { ok: true } });
}
