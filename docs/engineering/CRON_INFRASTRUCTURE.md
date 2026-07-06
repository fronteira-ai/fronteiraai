# CRON_INFRASTRUCTURE.md
# Scheduling infra: decoupled from Vercel (RC-3)

**Criado**: 2026-07-06 (PROGRAM Z — RC-3 — Infrastructure Decoupling)
**Categoria**: `docs/engineering/`
**Status**: infraestrutura vigente até a Release 2.0 decidir um scheduler dedicado

---

## 1. O problema

A Vercel Hobby recusa deployments cujo `vercel.json` declare qualquer cron mais frequente que uma vez por dia ("Hobby accounts are limited to daily cron jobs"). Três rotas violavam isso:

- `/api/cron/exchange/refresh` — `*/5 * * * *`
- `/api/cron/realtime-commerce/market-pulse` — `*/15 * * * *`
- `/api/cron/realtime-commerce/buyer-alerts` — `*/15 * * * *`

Isso não é um problema de código — as 5 rotas de cron deste projeto (`app/api/cron/**`) são Route Handlers Next.js comuns, autenticadas por segredo compartilhado (`lib/cron-auth.ts`, `requireCronSecret()`), sem nenhuma dependência do runtime de cron da Vercel. `vercel.json` é só uma das formas possíveis de disparar essas rotas — nunca a única estruturalmente possível.

## 2. Solução: desacoplar o gatilho, não a funcionalidade

`vercel.json` mantém apenas as 2 rotas já compatíveis com Hobby (`connectors/sync` diário, `marketplace-operations/snapshot` diário). As 3 rotas restantes continuam existindo, inalteradas, com o mesmo contrato HTTP — só passaram a ser disparadas por `.github/workflows/high-frequency-crons.yml` em vez de `vercel.json`.

**Por que GitHub Actions e não Supabase `pg_cron`/`pg_net` agora**: `pg_cron`/`pg_net` seriam a opção mais robusta a longo prazo (cadência sub-hora mais confiável que o scheduler do GitHub Actions, que pode atrasar em repositórios de baixa atividade), e o projeto já depende do Supabase — mas exigiria uma migration aplicada ao banco vivo (habilitar extensões, criar `cron.job`), e esta Wave (RC-3) foi explicitamente restrita a não alterar banco. GitHub Actions resolve o bloqueio de deploy imediatamente sem tocar em schema, API, rota ou domínio — ver Seção 4 para a recomendação de migrar para `pg_cron` na Release 2.0.

## 3. Configuração necessária (manual, uma vez)

Mesma convenção já usada por `.github/workflows/database.yml`: o workflow fica **dormant** (todo job pulado, sem falhar) até que estas variáveis existam em Settings → Secrets and variables → Actions:

| Nome | Tipo | Valor |
|---|---|---|
| `CRON_SECRET` | Secret | O mesmo valor já configurado na Vercel (Production) para as rotas `/api/cron/*` |
| `CRON_APP_URL` | Variable | URL pública de produção, sem barra final (ex.: `https://fronteiraai.vercel.app` ou o domínio customizado) |

Sem essas duas, `high-frequency-crons.yml` roda a cada disparo agendado, loga um `::warning::` e não faz nenhuma chamada HTTP — mesmo padrão de "falha fechada, sem barulho" já usado por `database.yml`.

## 4. Release 2.0 — próxima etapa recomendada

Migrar os 3 jobs de alta frequência (e, se fizer sentido, os 2 diários também, por consistência) para `pg_cron` + `pg_net` do Supabase:

- `pg_cron.schedule(...)` chamando `net.http_post`/`http_get` contra as mesmas URLs (`/api/cron/*`), com o mesmo header `Authorization: Bearer`.
- O segredo fica no Supabase Vault (`vault.create_secret`), nunca em texto puro na migration.
- Vantagem sobre GitHub Actions: execução dentro da própria infraestrutura de dados do projeto, sem depender do agendador de um CI de terceiros (que não garante latência sub-hora).
- Exige uma ADR própria (mudança de schema/extensões requer aprovação explícita, conforme regra permanente deste projeto) — não decidido nem implementado por este documento.

Alternativa caso a Release 2.0 opte por um scheduler dedicado fora do Supabase (ex.: um worker próprio, Temporal, um serviço de fila): o contrato HTTP + `CRON_SECRET` destas rotas não muda — qualquer scheduler novo aponta para as mesmas URLs sem exigir nova mudança de código nas rotas.
