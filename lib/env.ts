// Única fonte de verdade para variáveis de ambiente. Nenhum outro arquivo do
// projeto deve acessar `process.env` diretamente — importe `env` daqui.

function missingVarMessage(name: string): string {
  const onVercel = process.env.VERCEL === "1";

  const hint = onVercel
    ? `Configure "${name}" em Vercel → Project Settings → Environment Variables (Production/Preview) e refaça o deploy.`
    : `Defina "${name}" em ".env.local" na raiz do projeto (veja ".env.example").`;

  return `Variável de ambiente ausente: ${name}. ${hint}`;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(missingVarMessage(name));
  }
  return value;
}

// URL pública canônica do ParaguAI (robots.txt, sitemap, canonical, OG).
//
// Regra (Product Rebaseline — SEO Recovery):
// - Em DESENVOLVIMENTO o fallback `http://localhost:3000` é aceitável.
// - Em PRODUÇÃO (NODE_ENV=production, ex.: build de deploy Vercel) NÃO há
//   fallback para localhost: uma URL ausente/incorreta quebrou robots.txt,
//   sitemap e canonical apontando para localhost. Forçamos a presença para o
//   build falhar cedo em vez de publicar SEO inindexável silenciosamente.
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error(missingVarMessage("NEXT_PUBLIC_SITE_URL"));
  }
  return "http://localhost:3000";
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  NEXT_PUBLIC_SITE_URL: siteUrl(),
};
