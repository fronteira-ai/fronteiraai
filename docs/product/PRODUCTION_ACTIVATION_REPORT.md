# PRODUCTION_ACTIVATION_REPORT.md
# PROGRAM Δ — Mission Δ-2 — Production Activation

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08
**Natureza**: Correção de configuração de produção, autorizada explicitamente pelo CTO nesta sessão (Vercel env var + dado de conector). Nenhuma arquitetura alterada — uma limitação arquitetural real foi **descoberta**, não corrigida (fora do escopo desta missão).

---

## Auditoria — o que existia antes desta missão

| Componente | Estado encontrado |
|---|---|
| `vercel.json` | `/api/cron/connectors/sync` agendado nativamente (`0 6 * * *`, diário — dentro do limite do plano Hobby) |
| `.github/workflows/high-frequency-crons.yml` | Cobre **apenas** `exchange/refresh` e `realtime-commerce/*` — **não cobre** `connectors/sync`. Achado corretivo: relatórios anteriores (`PRODUCTION_BASELINE_1.9.md` §9) tratavam "CRON_SECRET não configurado" como um problema único; na verdade são dois secrets em dois sistemas diferentes (GitHub Actions vars/secrets vs. Vercel env vars), e apenas o segundo afeta connectors. |
| `lib/cron-auth.ts` | `requireCronSecret()` lê `process.env.CRON_SECRET` — uma **env var da Vercel** (Production), não um secret do GitHub Actions. Vercel injeta automaticamente `Authorization: Bearer $CRON_SECRET` em cron triggers nativos quando essa env var existe. |
| `CRON_SECRET` na Vercel (Production) | **Não existia** — confirmado via `vercel env ls production` (só 3 vars, todas Supabase) |
| `connectors.config` (produção) | **`{}` para os 4 conectores reais** — vazio, sem `syncFrequencyHours` |
| `app/api/cron/connectors/sync/route.ts` | Lógica de opt-in: `if (!config.syncFrequencyHours) continue;` — pula qualquer conector sem essa chave, silenciosamente, sem erro |
| `maxDuration` da rota | `60` segundos (também o teto do plano Vercel Hobby — não pode ser elevado sem upgrade de plano) |

## Causa raiz real (dois bloqueios independentes, ambos confirmados por evidência direta, não suposição)

1. **`CRON_SECRET` ausente na Vercel** → toda chamada de cron nativo recebia 401 antes de qualquer lógica de conector rodar.
2. **`connectors.config` vazio para os 4 conectores** → mesmo com `CRON_SECRET` corrigido, a rota pularia todos os 4 silenciosamente — nenhum jamais foi marcado como "devido" para sincronização automática.

## Correções aplicadas (configuração, não arquitetura)

1. **`CRON_SECRET` gerado (32 bytes, hex) e definido em Vercel Production** via `vercel env add`. Redeploy da produção executado (`vercel redeploy`) para que a env var passasse a valer — Vercel não aplica env vars novas a deployments já construídos.
2. **`connectors.config.syncFrequencyHours = 24` definido para os 4 conectores reais** — dry-run executado primeiro (confirmando exatamente as 4 mudanças pretendidas), depois `--execute`. Valor de 24h escolhido por bater com "Sync Frequency: Diária" já documentado por loja em `docs/marketplace/Tier1_Merchants.md` §5.

## Achado que esta missão não corrige — limitação arquitetural real, descoberta ao vivo

Testando a correção acima com uma chamada real e autenticada contra `/api/cron/connectors/sync` em produção: **timeout (504, `FUNCTION_INVOCATION_TIMEOUT`)**. Investigação: o histórico de sync de cada conector mostra execuções reais levando **3 a 5 minutos** (ex.: Roma Shopping ~3m10s, Atacado Connect ~4m34s) — muito acima do `maxDuration = 60` da rota, que é também o teto do plano Vercel Hobby (não elevável sem upgrade).

**Isso significa que a rota de cron nativa da Vercel, como está desenhada hoje, não consegue completar a sincronização de nenhum conector real dentro do seu próprio limite de tempo** — não é um problema específico desta missão nem um efeito colateral de 4 conectores estarem simultaneamente "devidos"; um único conector já excede o orçamento de tempo da função. Rotear a chamada via GitHub Actions (que tem timeout de horas) não resolveria — o limite de 60s é aplicado pela própria Vercel à função, independente de quem a chama.

**Por que isso não foi corrigido aqui**: resolver de verdade exige processamento em background/assíncrono (fila, worker dedicado, ou uma função de duração mais longa em um plano pago) — uma decisão de arquitetura real, explicitamente fora do escopo desta missão ("não alterar arquitetura", "não realizar refatorações"). Fica nomeado como candidato a ADR própria, não implementado.

## O que isso significa para "sincronização automática contínua"

Com as duas correções de configuração aplicadas, a rota de cron nativa da Vercel **autentica corretamente e identificaria os conectores devidos** — mas **não consegue executá-los até o fim** dentro do limite de 60s da plataforma. Na prática, hoje, a única forma confiável de sincronizar os 4 conectores é execução direta dos scripts existentes (`npm run sync:*:execute`), fora do ciclo de vida de uma função serverless de 60s — exatamente o caminho usado para a recertificação desta missão (`CONNECTOR_RECERTIFICATION_REPORT.md`). Isso é uma correção honesta ao Definition of Done original desta missão, não uma tentativa de contorná-lo silenciosamente.
