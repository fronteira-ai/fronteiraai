// Sprint 3C — gêmeo CommonJS de scripts/lib/supabaseTarget.ts.
//
// Duplicação deliberada, seguindo o precedente já existente neste projeto
// (loadEnvLocal existia nos dois lados): database/seed/ roda como script
// Node standalone em CJS, fora da árvore TypeScript. Ver ADR-012.
//
// Padrão: LOCAL. Produção exige SUPABASE_TARGET=production e
// SUPABASE_ALLOW_PRODUCTION=yes. A trava final é a asserção de loopback.
const path = require("path");
const fs = require("fs");

const DEFAULT_LOCAL_URL = "http://127.0.0.1:54321";
const REPO_ROOT = path.join(__dirname, "..", "..", "..");

function loadEnvFile(fileName) {
  const envPath = path.join(REPO_ROOT, fileName);
  if (!fs.existsSync(envPath)) return false;
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
  return true;
}

function isLoopbackUrl(url) {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

function resolveSupabaseTarget() {
  const raw = (process.env.SUPABASE_TARGET || "local").trim().toLowerCase();

  if (raw !== "local" && raw !== "production") {
    throw new Error(
      `SUPABASE_TARGET inválido: "${raw}". Valores aceitos: "local" (padrão) ou "production".`
    );
  }

  if (raw === "production") {
    if (process.env.SUPABASE_ALLOW_PRODUCTION !== "yes") {
      throw new Error(
        "SUPABASE_TARGET=production exige também SUPABASE_ALLOW_PRODUCTION=yes.\n" +
          "Trava deliberada (Sprint 3C). Para desenvolvimento, não defina nenhuma das duas."
      );
    }
    loadEnvFile(".env.local");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || (!serviceKey && !anonKey)) {
      throw new Error(
        "Modo produção: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar em .env.local."
      );
    }
    if (isLoopbackUrl(url)) {
      throw new Error(
        `Modo produção pedido, mas NEXT_PUBLIC_SUPABASE_URL aponta para loopback (${url}). Abortando.`
      );
    }
    console.warn(
      `[seed] ⚠  ALVO: PRODUÇÃO (${new URL(url).hostname}). Escritas afetam dados reais.`
    );
    return { target: "production", url, key: serviceKey || anonKey, usingServiceRole: !!serviceKey };
  }

  loadEnvFile(".env.development.local");

  const url =
    process.env.SUPABASE_LOCAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_LOCAL_URL;

  if (!isLoopbackUrl(url)) {
    throw new Error(
      `Modo local, mas a URL resolvida não é loopback: ${url}\n` +
        "Rode `supabase start` e gere .env.development.local com `npm run env:local`."
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!serviceKey && !anonKey) {
    throw new Error(
      "Modo local: nenhuma chave encontrada. Rode `supabase start` e depois `npm run env:local`."
    );
  }

  return { target: "local", url, key: serviceKey || anonKey, usingServiceRole: !!serviceKey };
}

module.exports = { resolveSupabaseTarget, isLoopbackUrl };
