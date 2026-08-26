// Sprint 3C — gera `.env.development.local` a partir do stack Supabase local.
//
// Executa `supabase status -o env` (leitura pura, apenas inspeciona os
// containers Docker) e escreve o arquivo que o Next.js e os scripts usam em
// desenvolvimento. As chaves nunca são impressas no terminal: só o arquivo
// (que já cai no `.gitignore` por `.env*`) as recebe.
//
// Uso: npm run env:local
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { isLoopbackUrl } from "./lib/supabaseTarget";

const OUT_FILE = ".env.development.local";

function readStatusEnv(): Record<string, string> {
  // `shell: true` via execSync: no Windows o binário resolvido é npx.cmd, que
  // execFileSync não consegue invocar diretamente.
  const raw = execSync("npx --no-install supabase status -o env", {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const out: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    const idx = trimmed.indexOf("=");
    if (!trimmed || idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed
      .slice(idx + 1)
      .trim()
      .replace(/^"(.*)"$/, "$1");
  }
  return out;
}

function main(): void {
  let status: Record<string, string>;
  try {
    status = readStatusEnv();
  } catch {
    console.error(
      "Não foi possível ler o status do Supabase local.\n" +
        "O stack está rodando? Suba com: npx supabase start"
    );
    process.exit(1);
  }

  const apiUrl = status.API_URL;
  const anonKey = status.ANON_KEY;
  const serviceKey = status.SERVICE_ROLE_KEY;

  if (!apiUrl || !anonKey || !serviceKey) {
    console.error("Status do Supabase local incompleto (API_URL/ANON_KEY/SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  // Trava: este script nunca pode gerar um arquivo apontando para produção.
  if (!isLoopbackUrl(apiUrl)) {
    console.error(`API_URL não é loopback (${apiUrl}). Abortando por segurança.`);
    process.exit(1);
  }

  const body = `# GERADO POR: npm run env:local (scripts/env-local.ts) — Sprint 3C
# Ambiente de DESENVOLVIMENTO. Aponta exclusivamente para o Supabase local
# em Docker. O Next.js dá precedência a este arquivo sobre .env.local em
# \`next dev\`, e scripts/lib/supabaseTarget.ts o lê no modo "local" (padrão).
#
# NÃO editar à mão: regenere com \`npm run env:local\` depois de cada
# \`supabase start\`. Não commitar (coberto por \`.env*\` no .gitignore).
#
# As chaves abaixo são as credenciais de demonstração do stack local do
# Supabase CLI — públicas por definição, sem valor fora desta máquina.

NEXT_PUBLIC_SUPABASE_URL=${apiUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}
SUPABASE_SERVICE_ROLE_KEY=${serviceKey}
SUPABASE_LOCAL_URL=${apiUrl}
NEXT_PUBLIC_SITE_URL=http://localhost:3000
CRON_SECRET=local-dev-only
`;

  fs.writeFileSync(path.join(process.cwd(), OUT_FILE), body, "utf8");
  console.log(`${OUT_FILE} gerado. NEXT_PUBLIC_SUPABASE_URL=${apiUrl}`);
  console.log("Chaves gravadas no arquivo (não impressas aqui).");
}

main();
