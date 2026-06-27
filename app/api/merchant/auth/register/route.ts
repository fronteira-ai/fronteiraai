import { NextResponse } from "next/server";
import { requireAuth, isMerchantAuthError } from "@/lib/merchant-auth";

export async function POST() {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { serviceClient, userId, email } = auth;

  // Idempotent: if merchant already exists, return it
  const { data: existing } = await serviceClient
    .from("merchants")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return NextResponse.json({ data: { merchantId: existing.id, alreadyExists: true } });
  }

  // Best-effort: update profile role. Non-fatal if it fails (e.g. old constraint).
  const { error: profileErr } = await serviceClient
    .from("profiles")
    .update({ role: "merchant" })
    .eq("id", userId);

  if (profileErr) {
    console.error("[register] profiles.role update failed (non-fatal):", profileErr.message);
  }

  // Create merchant record — this is the source of truth for merchant access
  const { data: merchant, error: merchantErr } = await serviceClient
    .from("merchants")
    .insert({
      user_id: userId,
      contact_email: email,
      status: "draft",
      plan: "free",
    })
    .select("id")
    .single();

  if (merchantErr) {
    console.error("[register] merchant insert failed:", merchantErr.message);
    return NextResponse.json({ error: `Erro ao criar perfil: ${merchantErr.message}` }, { status: 500 });
  }

  // Audit log (best-effort)
  await serviceClient.from("merchant_audit_logs").insert({
    merchant_id: merchant.id,
    user_id: userId,
    event_type: "register",
    payload: { email },
  });

  return NextResponse.json({ data: { merchantId: merchant.id, alreadyExists: false } });
}
