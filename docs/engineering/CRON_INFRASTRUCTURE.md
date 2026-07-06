# CRON_INFRASTRUCTURE.md
# Scheduling infra: decoupled from Vercel (RC-3)

**Criado**: 2026-07-06 (PROGRAM Z — RC-3 — Infrastructure Decoupling)
**Atualizado**: 2026-07-06 (RC-3 Final Hardening — ADR-052)
**Categoria**: `docs/engineering/`
**Status**: infraestrutura de produção vigente até a Release 2.0 decidir um scheduler dedicado

---

## 1. O problema

A Vercel Hobby recusa deployments cujo `vercel.json` declare qualquer cron mais frequente que uma vez por dia ("Hobby accounts are limited to daily cron jobs"). Três rotas violavam isso:

- `/api/cron/exchange/refresh` — `*/5 * * * *`
- `/api/cron/realtime-commerce/market-pulse` — `*/15 * * * *`
- `/api/cron/realtime-commerce/buyer-alerts` — `*/15 * * * *`

Isso não é um problema de código — as 5 rotas de cron deste projeto (`app/api/cron/**`) são Route Handlers Next.js comuns, autenticadas por segredo compartilhado (`lib/cron-auth.ts`, `requireCronSecret()`), sem nenhuma dependência do runtime de cron da Vercel. `vercel.json` é só uma das formas possíveis de disparar essas rotas — nunca a única estruturalmente possível.

## 2. Arquitetura atual

```
GitHub Actions (schedule: */5, */15)
        │
        ▼
.github/workflows/high-frequency-crons.yml
        │  job "check-config": CRON_SECRET/CRON_APP_URL configurados?
        │       não → ::warning::, nenhum job seguinte roda
        │       sim → prossegue
        ▼
.github/scripts/call-cron-endpoint.sh <name> <url>
        │  até 3 tentativas, timeout 20s/tentativa, backoff exponencial (2s, 4s)
        │  loga endpoint/timestamp/duração/HTTP status/resultado por tentativa
        ▼
HTTPS GET + Authorization: Bearer $CRON_SECRET
        ▼
app/api/cron/{exchange/refresh, realtime-commerce/market-pulse, realtime-commerce/buyer-alerts}
        │  requireCronSecret() — mesma auth das rotas diárias (vercel.json)
        ▼
lib/*-factory.ts → domínio real (exchange, realtime-commerce) — inalterado
```

`vercel.json` mantém apenas as 2 rotas já compatíveis com Hobby (`connectors/sync` diário, `marketplace-operations/snapshot` diário). As 3 rotas restantes continuam existindo, inalteradas, com o mesmo contrato HTTP — só passaram a ser disparadas pelo workflow acima em vez de `vercel.json`. Nenhuma rota, service ou domínio foi alterado por RC-3.

## 3. Fluxo completo de uma chamada

1. GitHub Actions dispara o workflow no horário agendado (`*/5 * * * *` para exchange-refresh; `*/15 * * * *` para o job de realtime-commerce) ou manualmente (`workflow_dispatch`).
2. `check-config` verifica se `CRON_SECRET` (secret) e `CRON_APP_URL` (variable) existem no repositório. Se não, loga `::warning::` e encerra — nenhuma chamada HTTP acontece (falha fechada, sem barulho).
3. Cada job de endpoint faz checkout do repositório (para ter acesso ao script) e invoca `call-cron-endpoint.sh` com o nome lógico do endpoint e a URL completa.
4. O script tenta até 3 vezes: timeout explícito de 20s por tentativa (`curl --max-time`), backoff exponencial entre tentativas (2s, depois 4s), e loga por tentativa: endpoint, timestamp ISO-8601 UTC, duração em ms, HTTP status (ou `000` se a conexão falhar antes de obter resposta), e resultado (`success`/`failure`).
5. Sucesso (HTTP 2xx) na primeira tentativa que funcionar → o script sai com código 0, o step/job passa.
6. Falha definitiva (3 tentativas esgotadas) → o script emite uma anotação `::error::` com o endpoint, a URL, o número de tentativas e o último status/erro, e sai com código 1 — isso falha o step, o job, e o workflow aparece como vermelho no GitHub Actions, visível sem precisar abrir o log.

## 4. Secrets/variáveis necessários (configuração manual, uma vez)

Mesma convenção já usada por `.github/workflows/database.yml`: o workflow fica **dormant** (todo job de endpoint pulado, sem falhar) até que estas duas entradas existam em Settings → Secrets and variables → Actions:

| Nome | Tipo | Valor |
|---|---|---|
| `CRON_SECRET` | Secret | O mesmo valor já configurado na Vercel (Production) para as rotas `/api/cron/*` |
| `CRON_APP_URL` | Variable | URL pública de produção, sem barra final (ex.: `https://fronteiraai.vercel.app` ou o domínio customizado) |

## 5. Vantagens desta solução

- **Zero mudança de código de produto**: nenhuma rota, API, service, domínio ou componente foi tocado — só o gatilho de agendamento mudou de lugar.
- **Zero mudança de banco**: ao contrário de uma migração para `pg_cron`, não exige habilitar extensões nem alterar schema.
- **Observabilidade real**: cada tentativa é logada de forma estruturada (endpoint/timestamp/duração/status/resultado) diretamente no log do GitHub Actions — antes, o cron da Vercel não expunha esse nível de detalhe por chamada.
- **Falha visível, não silenciosa**: uma falha definitiva quebra o workflow com uma anotação clara, em vez de simplesmente não fazer nada (o que aconteceria sem essa Wave, já que a Vercel sequer aceitaria o deploy com essas 3 entradas).
- **Reversível**: se a Vercel mudar de plano (Pro permite cron sub-diário) ou este projeto migrar de hosting, basta devolver as 3 entradas a `vercel.json` — nenhuma rota precisa mudar.

## 6. Limitações conhecidas

- **Jitter do scheduler do GitHub Actions**: o GitHub documenta que workflows agendados podem atrasar minutos em relação ao horário exato, especialmente em repositórios de baixa atividade — a cadência de 5/15 minutos é uma meta, não uma garantia dura (a mesma ressalva já existia implicitamente com a Vercel, mas o comportamento de atraso do GitHub Actions é mais conhecido/documentado).
- **Timeout fixo de 20s por tentativa**: adequado para as 5 rotas atuais (`maxDuration = 30`/`60` no lado do Next.js), mas precisa ser revisado se uma rota futura passar a demorar mais.
- **Dependência de um terceiro (GitHub Actions) no caminho crítico de dados quase-em-tempo-real**: se o GitHub Actions tiver uma interrupção de serviço, os 3 crons de alta frequência param até o serviço voltar — mesmo risco que qualquer CI externo tem, mitigado pelo fato de que a Home já degrada honestamente (não fabrica dado) quando esses jobs atrasam.
- **Sem alerta automático de falha persistente**: hoje, uma falha aparece como um workflow run vermelho no GitHub — não há push automático (Slack/email) avisando alguém. Fica como item para a Release 2.0.

## 7. Como migrar para `pg_cron`/`pg_net` no futuro (Release 2.0)

Migrar os 3 jobs de alta frequência (e, se fizer sentido, os 2 diários também, por consistência) para `pg_cron` + `pg_net` do Supabase:

1. Habilitar as extensões `pg_cron` e `pg_net` via migration (`supabase/migrations/*`), com sua própria ADR — mudança de schema/extensões requer aprovação explícita, conforme regra permanente deste projeto.
2. Guardar `CRON_SECRET` no Supabase Vault (`vault.create_secret`), nunca em texto puro na migration.
3. `cron.schedule('exchange-refresh', '*/5 * * * *', $$ select net.http_get(url := '<CRON_APP_URL>/api/cron/exchange/refresh', headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'))) $$)` — mesmo padrão para os outros 2 endpoints, mesma URL/contrato HTTP, sem mudar as rotas Next.js.
4. Vantagem sobre GitHub Actions: execução dentro da própria infraestrutura de dados do projeto, sem depender do agendador de um CI de terceiros (que não garante latência sub-hora) — remove a limitação da Seção 6.
5. Alternativa caso a Release 2.0 opte por um scheduler dedicado fora do Supabase (ex.: um worker próprio, Temporal, um serviço de fila): o contrato HTTP + `CRON_SECRET` destas rotas não muda — qualquer scheduler novo aponta para as mesmas URLs sem exigir nova mudança de código nas rotas. Este é o ponto central da decisão de RC-3: o scheduler é substituível porque nunca foi acoplado ao código.

Ver ADR-052 (`docs/operations/DECISIONS.md`) para o registro formal desta decisão arquitetural.
