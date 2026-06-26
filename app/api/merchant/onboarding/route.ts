import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { logAuditEvent } from "@/services/merchant.service";

export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient, userId } = auth;
  const body = await request.json() as Record<string, unknown>;

  const step = Number(body.step ?? merchant.onboarding_step);
  const done = Boolean(body.done ?? false);

  // Build update payload based on step
  const update: Record<string, unknown> = { onboarding_step: step };

  if (body.company_name) update.company_name = body.company_name;
  if (body.company_doc) update.company_doc = body.company_doc;
  if (body.company_website) update.company_website = body.company_website;
  if (body.contact_phone) update.contact_phone = body.contact_phone;
  if (body.contact_whatsapp) update.contact_whatsapp = body.contact_whatsapp;
  if (body.plan) update.plan = body.plan;
  if (done) {
    update.onboarding_done = true;
    update.status = "active";
  }

  const { error } = await serviceClient
    .from("merchants")
    .update(update)
    .eq("id", merchant.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Link store if provided
  if (body.store_id) {
    await serviceClient.from("merchant_stores").upsert(
      { merchant_id: merchant.id, store_id: body.store_id, is_primary: true },
      { onConflict: "merchant_id,store_id" }
    );
  }

  await logAuditEvent(
    merchant.id, userId,
    done ? "onboarding_complete" : "onboarding_step",
    { step, done },
    serviceClient
  );

  return NextResponse.json({ data: { step, done } });
}
