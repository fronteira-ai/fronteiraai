import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Merchant } from "@/types/merchant";

export interface MerchantAuthResult {
  userId: string;
  email: string;
  merchant: Merchant;
  serviceClient: SupabaseClient;
}

/**
 * Validates session + merchant record existence.
 * Does NOT rely on profiles.role — the merchant record IS the source of truth.
 * Returns 401/403 NextResponse on failure.
 */
export async function requireMerchant(): Promise<MerchantAuthResult | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const serviceClient = getSupabaseServiceClient();

  const { data: merchant, error: merchantErr } = await serviceClient
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (merchantErr || !merchant) {
    return NextResponse.json({ error: "Acesso restrito a lojistas" }, { status: 403 });
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    merchant: merchant as Merchant,
    serviceClient,
  };
}

/** Validates session only — used during registration before merchant record is created. */
export async function requireAuth(): Promise<{ userId: string; email: string; serviceClient: SupabaseClient } | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    serviceClient: getSupabaseServiceClient(),
  };
}

export function isMerchantAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
