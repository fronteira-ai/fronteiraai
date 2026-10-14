import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

// ─────────────────────────────────────────────────────────────────────────────
// Mission 05.19 — guarda de deriva (drift) da infraestrutura de cron.
//
// Motivo: a Mission 05.18 encontrou documentação afirmando "5 rotas" quando já
// existiam 7, e o plano de agendamento tinha um bug de zero à esquerda que pulava
// o refresh de câmbio em 00 e 05 minutos. Este teste transforma os invariantes do
// plano em código: esquecer uma rota nova, perder uma frequência na migração para
// o VPS ou reintroduzir o bug de comparação passa a QUEBRAR A SUITE em vez de
// virar dívida silenciosa.
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const CRON_DIR = join(ROOT, "app", "api", "cron");
const RUN_CRONS = join(ROOT, "infra", "selfhosted", "app", "cron", "run-crons.sh");
const TIMER = join(ROOT, "infra", "selfhosted", "app", "cron", "paraguai-crons.timer");
const SERVICE = join(ROOT, "infra", "selfhosted", "app", "cron", "paraguai-crons.service");
const DEPLOY = join(ROOT, "infra", "selfhosted", "app", "deploy.sh");
const VERCEL = join(ROOT, "vercel.json");

function walkRouteFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return walkRouteFiles(full);
    return entry === "route.ts" ? [full] : [];
  });
}

const routeFiles = walkRouteFiles(CRON_DIR);
const routes = routeFiles.map((f) =>
  f
    .replace(ROOT, "")
    .replace(/\\/g, "/")
    .replace("/route.ts", "")
    // o script chama `/api/cron/...` (sem o prefixo de diretório do App Router)
    .replace(/^\/app/, "")
);
const runCrons = readFileSync(RUN_CRONS, "utf8");

describe("plano de agendamento dos crons (Mission 05.19)", () => {
  it("descobre os 7 endpoints esperados", () => {
    expect(routes).toHaveLength(7);
    expect(new Set(routes).size).toBe(7);
  });

  it("todo endpoint de cron exige o segredo compartilhado (fail-closed) e é GET", () => {
    for (const file of routeFiles) {
      const src = readFileSync(file, "utf8");
      expect(src).toContain("requireCronSecret");
      expect(src).toMatch(/export async function GET/);
    }
  });

  it("nenhum endpoint fica órfão: todos estão no plano self-hosted", () => {
    for (const route of routes) {
      expect(runCrons).toContain(route);
    }
  });

  it("preserva as frequências originais de cada grupo", () => {
    expect(runCrons).toMatch(/MIN % 5.*exchange\/refresh/); // */5
    expect(runCrons).toMatch(/MIN % 15/); // */15
    for (const p of [
      "/api/cron/realtime-commerce/market-pulse",
      "/api/cron/realtime-commerce/buyer-alerts",
      "/api/cron/canonical-catalog/merge-suggestions",
      "/api/cron/connectors/sync",
    ]) {
      expect(runCrons).toContain(p);
    }
    expect(runCrons).toMatch(/HOUR" -eq 3.*outbox-maintenance/); // diário 03:00
    expect(runCrons).toMatch(/HOUR" -eq 7.*marketplace-operations\/snapshot/); // diário 07:00
  });

  it("usa remoção portável do zero à esquerda (dash-safe) — 05.19 corrigida na 05.20", () => {
    // Só o CÓDIGO interessa aqui: o comentário do script cita o padrão antigo de
    // propósito (documenta o bug), e um assert ingênuo o acusaria como violação.
    const codeOnly = runCrons
      .split("\n")
      .filter((line) => !line.trim().startsWith("#"))
      .join("\n");
    expect(codeOnly).toMatch(/MIN=\$\{MIN#0\}/);
    expect(codeOnly).toMatch(/HOUR=\$\{HOUR#0\}/);
    expect(codeOnly).toMatch(/MIN % 5/);
    expect(codeOnly).toMatch(/MIN % 15/);
    // `10#` existe em bash mas NÃO em dash (/bin/sh do Debian): descobrir isso em
    // produção custou o script inteiro. Nunca mais.
    expect(codeOnly).not.toMatch(/10#/);
    expect(codeOnly).not.toMatch(/case "\$MIN" in/);
    expect(codeOnly).not.toMatch(/\|\s*5\s*\|/);
  });

  it("não admite duas execuções simultâneas (flock + oneshot sem RemainAfterExit)", () => {
    expect(runCrons).toContain("flock -n");
    const service = readFileSync(SERVICE, "utf8");
    expect(service).toContain("Type=oneshot");
    expect(service).not.toContain("RemainAfterExit");
  });

  it("timer dispara a cada 5 minutos e ativa o unit correto", () => {
    const timer = readFileSync(TIMER, "utf8");
    expect(timer).toContain("OnCalendar=*:0/5");
    expect(timer).toContain("Unit=paraguai-crons.service");
  });

  it("desativação coordenada: vercel.json não declara mais crons", () => {
    const vercel = JSON.parse(readFileSync(VERCEL, "utf8")) as { crons?: unknown[] };
    expect(vercel.crons ?? []).toHaveLength(0);
  });

  it("modo dry-run existe e não faz chamadas HTTP", () => {
    expect(runCrons).toMatch(/dry-run/);
    expect(runCrons).toContain("DRY");
  });

  it("deploy.sh: recusa checkout sujo, valida o compose e tem rollback", () => {
    const deploy = readFileSync(DEPLOY, "utf8");
    expect(deploy).toMatch(/checkout sujo/);
    expect(deploy).toContain("--force");
    expect(deploy).toContain("config --quiet");
    expect(deploy).toContain("--rollback");
    // o stack Supabase nunca é referenciado pelo deploy do frontend
    expect(deploy).not.toMatch(/supabase-(db|rest|kong|auth|storage)/);
  });
});
