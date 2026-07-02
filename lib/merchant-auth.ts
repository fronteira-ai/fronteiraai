import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Merchant } from "@/types/merchant";
import {
  SupabaseMerchantDelegateRepository,
  ROLE_PERMISSIONS,
  Permission,
  type DelegateRole,
} from "@/src/domains/merchant-ownership";

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

export interface MerchantContextResult {
  userId: string;
  email: string;
  merchant: Merchant;
  role: "owner" | DelegateRole;
  permissions: Permission[];
  serviceClient: SupabaseClient;
}

/**
 * Additive — does not replace requireMerchant(). Resolves either the owner
 * (full permissions) or an active delegate (role-scoped permissions) for
 * the logged-in user. Only the new delegation-aware routes built in Wave 5
 * use this; every pre-existing merchant route keeps using requireMerchant()
 * unchanged (retrofitting delegate access into all of them is explicitly
 * deferred — see RELEASE_1_7_WAVE_5_EXECUTION_PLAN.md).
 */
export async function requireMerchantContext(): Promise<MerchantContextResult | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const serviceClient = getSupabaseServiceClient();

  const { data: ownedMerchant } = await serviceClient.from("merchants").select("*").eq("user_id", user.id).maybeSingle();
  if (ownedMerchant) {
    return {
      userId: user.id,
      email: user.email ?? "",
      merchant: ownedMerchant as Merchant,
      role: "owner",
      permissions: Object.values(Permission),
      serviceClient,
    };
  }

  const delegateRepo = new SupabaseMerchantDelegateRepository(serviceClient);
  const delegate = await delegateRepo.findActiveByUserId(user.id);
  if (!delegate) {
    return NextResponse.json({ error: "Acesso restrito a lojistas" }, { status: 403 });
  }

  const { data: merchant } = await serviceClient.from("merchants").select("*").eq("id", delegate.merchantId).maybeSingle();
  if (!merchant) {
    return NextResponse.json({ error: "Acesso restrito a lojistas" }, { status: 403 });
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    merchant: merchant as Merchant,
    role: delegate.role,
    permissions: ROLE_PERMISSIONS[delegate.role],
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
