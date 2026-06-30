import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Strips BOM (U+FEFF, charCode 65279) and surrounding whitespace.
// BOM appears when env vars are copy-pasted from Windows editors or terminals.
// Node.js fetch rejects HTTP header values containing chars > 255.
function sanitizeEnvVar(value: string | undefined): string {
  return (value ?? "").replace(/^﻿/, "").trim();
}

let _serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient(): SupabaseClient {
  if (!_serviceClient) {
    const url = sanitizeEnvVar(process.env.NEXT_PUBLIC_SUPABASE_URL);
    const key = sanitizeEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !key) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para operações administrativas."
      );
    }
    _serviceClient = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _serviceClient;
}
