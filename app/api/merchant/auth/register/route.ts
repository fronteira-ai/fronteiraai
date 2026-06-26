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

  // Upgrade profile role to merchant
  const { error: profileErr } = await serviceClient
    .from("profiles")
    .update({ role: "merchant" })
    .eq("id", userId);

  if (profileErr) {
    return NextResponse.json({ error: `profile update: ${profileErr.message}` }, { status: 500 });
  }

  // Create merchant record
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
    return NextResponse.json({ error: `merchant create: ${merchantErr.message}` }, { status: 500 });
  }

  // Audit log
  await serviceClient.from("merchant_audit_logs").insert({
    merchant_id: merchant.id,
    user_id: userId,
    event_type: "register",
    payload: { email },
  });

  return NextResponse.json({ data: { merchantId: merchant.id, alreadyExists: false } });
}
