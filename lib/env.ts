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

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ),
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
