// Cliente Supabase exclusivo das ferramentas de database/seed/. Lê
// process.env diretamente (não via lib/env.ts) porque este código roda como
// um script Node standalone (via `node database/seed/index.js`), fora da
// árvore da aplicação Next.js que lib/env.ts/ADR-001 governam — ver
// docs/operations/DECISIONS.md, ADR-012, para a justificativa completa dessa fronteira.
const path = require("path");
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", "..", "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1")
      .replace(/^'(.*)'$/, "$1");
    if (!(key in process.env)) process.env[key] = value;
  }
}

function getClient() {
  loadEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || (!serviceKey && !anonKey)) {
    throw new Error(
      "Defina NEXT_PUBLIC_SUPABASE_URL e (idealmente) SUPABASE_SERVICE_ROLE_KEY em .env.local antes de rodar o seed."
    );
  }

  if (!serviceKey) {
    console.warn(
      "[AVISO] SUPABASE_SERVICE_ROLE_KEY ausente — usando a chave anônima. " +
        "Inserts/updates podem falhar por RLS se a tabela não permitir escrita pública. " +
        "Ver docs/engineering/TECH_DEBT.md."
    );
  }

  return createClient(url, serviceKey || anonKey);
}

module.exports = { getClient };
