// Cliente Supabase exclusivo das ferramentas de database/seed/. Lê
// process.env diretamente (não via lib/env.ts) porque este código roda como
// um script Node standalone (via `node database/seed/index.js`), fora da
// árvore da aplicação Next.js que lib/env.ts/ADR-001 governam — ver
// docs/operations/DECISIONS.md, ADR-012, para a justificativa completa dessa fronteira.
//
// Sprint 3C: para onde este cliente aponta é decidido por ./target.js. O
// padrão passou a ser o Supabase LOCAL; produção exige
// SUPABASE_TARGET=production + SUPABASE_ALLOW_PRODUCTION=yes.
const { createClient } = require("@supabase/supabase-js");
const { resolveSupabaseTarget } = require("./target");

function getClient() {
  const resolved = resolveSupabaseTarget();

  if (!resolved.usingServiceRole) {
    console.warn(
      "[AVISO] SUPABASE_SERVICE_ROLE_KEY ausente — usando a chave anônima. " +
        "Inserts/updates podem falhar por RLS se a tabela não permitir escrita pública. " +
        "Ver docs/engineering/TECH_DEBT.md."
    );
  }

  return createClient(resolved.url, resolved.key);
}

module.exports = { getClient };
