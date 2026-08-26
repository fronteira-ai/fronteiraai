// Sprint 3C — separação inequívoca entre LOCAL e PRODUÇÃO.
//
// Antes desta missão, todo script de escrita (sync:*, db:seed:execute,
// canonical-catalog:bootstrap, marketplace-memory:backfill, catalog-recovery)
// lia `.env.local` diretamente e escrevia em PRODUÇÃO — sem confirmação,
// sem dry-run obrigatório, com service_role (que ignora RLS). Bastava um
// comando errado no terminal.
//
// Agora o padrão é LOCAL. Produção exige DUAS variáveis explícitas.
//
//   Desenvolvimento (padrão, nada a configurar):
//     npm run sync:shoppingchina:execute
//
//   Produção (deliberado, nunca acidental):
//     SUPABASE_TARGET=production SUPABASE_ALLOW_PRODUCTION=yes npm run ...
//
// A trava final não é a variável e sim a asserção de host: em modo local o
// resolver RECUSA qualquer URL que não seja loopback. Mesmo que
// `.env.development.local` seja preenchido errado com a URL de produção,
// o script aborta antes de abrir conexão.

import path from "path";
import fs from "fs";

export type SupabaseTarget = "local" | "production";

export interface ResolvedTarget {
  target: SupabaseTarget;
  url: string;
  key: string;
  usingServiceRole: boolean;
}

const DEFAULT_LOCAL_URL = "http://127.0.0.1:54321";

/** Carrega um arquivo .env sem sobrescrever variáveis já presentes no ambiente. */
function loadEnvFile(fileName: string): boolean {
  const envPath = path.join(process.cwd(), fileName);
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

export function isLoopbackUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1";
  } catch {
    return false;
  }
}

export function resolveSupabaseTarget(): ResolvedTarget {
  const raw = (process.env.SUPABASE_TARGET ?? "local").trim().toLowerCase();

  if (raw !== "local" && raw !== "production") {
    throw new Error(
      `SUPABASE_TARGET inválido: "${raw}". Valores aceitos: "local" (padrão) ou "production".`
    );
  }

  if (raw === "production") {
    if (process.env.SUPABASE_ALLOW_PRODUCTION !== "yes") {
      throw new Error(
        "SUPABASE_TARGET=production exige também SUPABASE_ALLOW_PRODUCTION=yes.\n" +
          "Esta é uma trava deliberada (Sprint 3C): escrever em produção nunca deve\n" +
          "ser o resultado de um comando digitado por engano. Para desenvolvimento,\n" +
          "não defina nenhuma das duas — o padrão já é o Supabase local."
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
        `Modo produção pedido, mas NEXT_PUBLIC_SUPABASE_URL aponta para loopback (${url}). Abortando por inconsistência.`
      );
    }

    console.warn(
      `[supabase] ⚠  ALVO: PRODUÇÃO (${new URL(url).hostname}). Escritas afetam dados reais.`
    );
    return { target: "production", url, key: serviceKey ?? anonKey!, usingServiceRole: !!serviceKey };
  }

  // ── LOCAL (padrão) ──────────────────────────────────────────────────────
  // Só `.env.development.local` é lido. `.env.local` (produção) é ignorado
  // de propósito neste caminho — ele não pode influenciar o modo local.
  loadEnvFile(".env.development.local");

  const url =
    process.env.SUPABASE_LOCAL_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    DEFAULT_LOCAL_URL;

  if (!isLoopbackUrl(url)) {
    throw new Error(
      `Modo local, mas a URL resolvida não é loopback: ${url}\n` +
        "Isto quase sempre significa que .env.development.local está ausente ou\n" +
        "preenchido com credenciais de produção. Rode `supabase start` e gere o\n" +
        "arquivo com `npm run env:local`. Abortando antes de abrir conexão."
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!serviceKey && !anonKey) {
    throw new Error(
      "Modo local: nenhuma chave encontrada. Rode `supabase start` e depois `npm run env:local`\n" +
        "para gerar .env.development.local com as credenciais do stack local."
    );
  }

  return { target: "local", url, key: serviceKey ?? anonKey!, usingServiceRole: !!serviceKey };
}
