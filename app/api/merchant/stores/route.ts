import { NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  const { data: linked } = await serviceClient
    .from("merchant_stores")
    .select("id, is_primary, store_id, stores!inner(id, name, slug, city, country, website, active)")
    .eq("merchant_id", merchant.id);

  return NextResponse.json({ data: linked ?? [] });
}

export async function POST() {
  // Returns all available stores for merchant to link during onboarding
  const { getSupabaseServiceClient } = await import("@/lib/supabase/service");
  const serviceClient = getSupabaseServiceClient();

  const { data: stores } = await serviceClient
    .from("stores")
    .select("id, name, slug, city, country, website, active")
    .eq("active", true)
    .order("name");

  return NextResponse.json({ data: stores ?? [] });
}
