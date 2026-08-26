import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseTarget } from "./supabaseTarget";

// Sprint 3C: este cliente não decide mais sozinho para onde escrever. A
// resolução (e as travas contra atingir produção por acidente) vive em
// ./supabaseTarget.ts. O padrão é o Supabase LOCAL; produção exige
// SUPABASE_TARGET=production + SUPABASE_ALLOW_PRODUCTION=yes.
//
// Precedente anterior (ADR-012): ler .env.local direto, fora de lib/env.ts,
// por rodar como script Node standalone. Isso continua valendo — o que muda
// é qual arquivo é lido em cada modo.
export function getServiceClient(): SupabaseClient {
  const resolved = resolveSupabaseTarget();

  if (!resolved.usingServiceRole) {
    console.warn(
      "[connectors] SUPABASE_SERVICE_ROLE_KEY ausente — usando a chave anônima. " +
        "Escritas podem falhar por RLS."
    );
  }

  return createClient(resolved.url, resolved.key);
}
