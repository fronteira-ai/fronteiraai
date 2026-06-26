import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AdminAuthResult {
  userId: string;
  email: string;
  role: "admin" | "operator";
  serviceClient: SupabaseClient;
}

export async function requireAdmin(): Promise<AdminAuthResult | NextResponse> {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const serviceClient = getSupabaseServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "operator")) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as "admin" | "operator",
    serviceClient,
  };
}

export function isAuthError(result: unknown): result is NextResponse {
  return result instanceof NextResponse;
}
