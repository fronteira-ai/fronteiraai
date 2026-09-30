# MISSION 05.3 — VALIDAÇÃO PÓS-INCIDENTE

**Categoria**: `docs/operations/`
**Janela desta execução**: 2026-09-30 21:09:00–21:15:00 UTC (início da observação; mudança aplicada às **20:49 UTC**)
**Natureza**: **somente leitura.** Nenhuma alteração de código, banco ou infraestrutura nesta missão.
**Alcance**: das 7 validações pedidas, **5 estão concluídas com medição** e **2 dependem do próximo ciclo do cron diário** (~07:53–07:54 UTC de 2026-10-01), que está ~11 h à frente — esta sessão não pode atravessar essa janela. O que está pendente está marcado como **PENDENTE_JANELA**, com o comando exato e o valor esperado.

---

## STATUS

| # | Validação pedida | Status | Resultado |
|---|---|---|---|
| 1 | PGRST003 sem novos eventos | ✅ **CONCLUÍDO** | **0 novos** — total 23 (igual ao baseline); **0** desde 20:49 |
| 2 | 57014 sem novo burst | ✅ **CONCLUÍDO** | **0 novos** — total 124 (igual ao baseline); **0** desde 20:49 |
| 3 | Kong 502/503/504/upstream sem regressão | ✅ **CONCLUÍDO** | **0 respostas 5xx** e **0 linhas de erro/upstream** depois de 20:49, com **5.224 requisições** no período |
| 4 | Price intelligence usando o novo índice | ✅ **CONCLUÍDO** | Índice em uso (**228 scans**, plano `Index Scan Backward`); nenhuma regressão nas outras rotas de `price_history` (ver NEW RISKS) |
| 5 | Marketplace operations: Fix 1 (402 → 1) | ⏳ **PENDENTE_JANELA** | O sweep só roda no cron diário. **Bloqueado pelo horário**, não por falta de dados |
| 6 | Recursos (Kong/PostgREST/PostgreSQL) | ✅ **CONCLUÍDO** | Sem regressão; Kong segue no teto histórico (~85%), PG confortável (13/100 conexões) |
| 7 | Preview Vercel sem `NEXT_PUBLIC_SUPABASE_URL` | ✅ **CONCLUÍDO (diagnóstico)** | Confirmado: **todas** as 5 variáveis existem **apenas** em Production. Correção **não** aplicada (conforme instrução) |

**Recorrência do incidente até agora: NÃO.** A janela de pico ainda não foi atravessada (ver INCIDENT RECURRENCE).

---

## METRICS BEFORE / AFTER

### Erros (fonte: `docker logs supabase-rest`, vida do container)

| Métrica | BEFORE (20:47 UTC) | AFTER (21:09–21:15 UTC) | Delta |
|---|---|---|---|
| `PGRST003` (total) | 23 | **23** | **0** |
| `57014` (total) | 124 | **124** | **0** |
| `PGRST003` desde a mudança | — | **0** | — |
| `57014` desde a mudança | — | **0** | — |
| Timestamps de erro nas últimas 26 h | 52×07:53 + 4×07:54 | **52×07:53 + 4×07:54** | **nenhum timestamp novo** |

### Kong (access log)

| Métrica | Valor |
|---|---|
| Requisições após 20:49 UTC | **5.224** |
| Respostas 5xx após 20:49 UTC | **0** |
| Linhas de erro/upstream após 20:49 UTC | **0** |

### Query crítica (`price_history`, janela de 7 dias)

| Métrica | BEFORE | AFTER |
|---|---|---|
| Plano | `Seq Scan`, 800 buffers | **`Index Scan Backward using price_history_recorded_at_idx`**, 2 buffers |
| Tempo | 88,4 / 139,1 / 74,3 ms | **0,262 / 0,929 / 0,457 ms** (re-checagem agora: **0,512 ms**) |
| Índice | inexistente | `price_history_recorded_at_idx`, `indisvalid = t`, 1.608 kB |
| `public_indexes` | 235 | **236** |

### Recursos (21:09 UTC)

| Componente | Uso | Limite | Antes do fix |
|---|---|---|---|
| Kong | **436,6 MiB (85,27%)** | 512 MiB | 444 MiB (~87%) — **estável**, segue no teto histórico |
| PostgREST (`rest`) | 234,4 MiB (45,79%) | 512 MiB | — |
| PostgreSQL (`db`) | 361,1 MiB (11,76%) — CPU 37% | 3 GiB | — |
| Conexões PG | **13** backend(s) (1 ativa, 12 idle) | `max_connections` = 100 | pico observado no incidente: 20 |
| Cache hit do banco | **100,00%** (`blks_hit` 65,7 bi / `blks_read` 752 mil) | — | — |
| Disco | 22 G usados de 91 G (24%) | — | — |
| Log do Kong em disco | **2,8 GB** (sem `max-size`/rotação) | — | 2,9 GB — cresce monotonicamente |
| `PGRST_DB_POOL` / timeouts | ausente / `anon 3s`, `authenticated 8s` | — | **inalterados** (nada foi tocado) |

---

## INCIDENT RECURRENCE

**Estado: sem recorrência observada em 20 minutos de validação; a janela de pico ainda não foi atravessada.**

- O incidente original aconteceu em **07:53:10–07:54:14 UTC** (pico do cron diário + crawl anônimo). A validação de recorrência só tem valor **depois** de atravessar esse horário novamente, ou seja em **2026-10-01, 07:53 UTC**.
- O que já é evidência relevante: no período pós-mudança o sistema processou **5.224 requisições no gateway** (incluindo **7.399 requisições a `price_history`** no tail analisado — ou seja, tráfego de catálogo em escala de crawl, o mesmo tipo de carga que derrubou o pool às 07:53) com **0 erros PGRST003, 0 timeouts 57014 e 0 respostas 5xx**.

### PENDENTE_JANELA — comandos de validação (executar depois de 2026-10-01 07:54 UTC)

```bash
K=~/.ssh/paraguai-prod-01-v2; H=ubuntu@94.103.168.244
# 1+2) nenhum erro novo (baseline: 23 / 124)
ssh -i $K $H 'sudo -n docker logs supabase-rest 2>&1 | grep -c PGRST003'   # esperado: 23
ssh -i $K $H 'sudo -n docker logs supabase-rest 2>&1 | grep -c 57014'      # esperado: 124
ssh -i $K $H 'sudo -n docker logs --since 2026-10-01T07:40:00 supabase-rest 2>&1 | grep -cE "PGRST003|57014"'  # esperado: 0
# 3) Kong: 5xx na janela de pico (baseline do incidente: 47×500 + 94×504 = 141)
ssh -i $K $H 'sudo -n docker inspect supabase-kong --format "{{.LogPath}}"'   # então tail -c e grep da janela
# 5) Fix 1: 402 -> 1 (baseline medido: 402 requisições a marketplace_alerts em um ciclo)
ssh -i $K $H 'sudo -n docker logs --since 2026-10-01T07:40:00 supabase-kong 2>&1 | grep -c marketplace_alerts'  # esperado: 1
ssh -i $K $H 'sudo -n docker exec supabase-db psql -U postgres -c "SELECT count(*) FROM marketplace_alerts;"'   # esperado: 626 (nenhum alerta novo criado)
# 6) recursos no pico
ssh -i $K $H 'sudo -n docker stats --no-stream --format "{{.Name}}|{{.MemUsage}}|{{.MemPerc}}"'
```
**Critério de falha** para declarar recorrência: qualquer `PGRST003`/`57014` novo, qualquer 5xx no Kong na janela, ou contagem de `marketplace_alerts` no Kong > ~10.

---

## FIX VALIDATION

### Fix no banco (índice) — **VALIDADO**, inclusive sob carga

- O planner passa a usar `price_history_recorded_at_idx`: **228 scans** desde a criação (21:12 UTC), com o plano `Index Scan Backward` confirmado repetidamente (0,512 ms agora).
- **Sem regressão nas outras rotas de `price_history`** — verificado nas duas formas concorrentes:
  - forma *canonical-catalog* (`offers.canonical_product_id=eq.…`): continua usando `idx_offers_canonical_product` + `price_history_offer_recorded_idx`, **0,665–0,682 ms**, 11 buffers. Forçando o cenário sem índices (toggle de sessão, read-only) a mesma consulta custa **98,1 ms** — ou seja, o plano atual é o bom.
  - forma *por produto* (Shape A, `/product/[slug]`): 0,63–0,72 ms, inalterada.
- O `Sort` de 72.651 linhas (que existia em toda leitura por janela) foi **eliminado**.

### Fix 1 (marketplace alerts, 402 → 1) — **PENDENTE_JANELA**

O sweep roda **apenas** no cron diário `marketplace-operations/snapshot`; nenhum ciclo ocorreu após o deploy. Não há como validar a contagem em produção sem esperar a janela (e disparar o endpoint manualmente seria uma mutação não autorizada — não foi feito).

**Evidência indireta já disponível** (não substitui a medição em produção):
- Regressão automatizada em `src/domains/marketplace-operations/__tests__/MarketplaceAlertService.test.ts`: 200 candidatos ⇒ **exatamente 1** leitura; varredura mista ⇒ 1 leitura; varredura vazia ⇒ 0 leituras/escritas.
- `marketplace_alerts` tem **626 linhas** e o índice `idx_marketplace_alerts_open_key` existe — o custo por leitura pontual era 0,469 ms e a leitura em lote 1,71 ms (medidos na Mission 05.1).
- O log do PostgREST (que só registra erros) não tem nenhuma linha nova de `marketplace_alerts`.

### Fix 2 (`/product/[slug]`) — **VALIDADO por smoke test**

2 páginas de produto responderam 200 sem marcadores de erro, com o card de Price Intelligence presente, servidas pelo deployment novo.

---

## NEW RISKS

1. **O novo índice é percorrido inteiro por alguma consulta recorrente (~3×/min).** Medido: `idx_tup_read` cresce em **72.651 entradas por scan** — exatamente o tamanho da tabela — em 3 scans/minuto (delta de 60 s: 219 → 222 scans, +217.953 entradas). **Materialidade hoje: baixa** — 100% dos acessos vêm de buffer (`blks_read ≈ 0`), o índice tem 1,6 MB (cabe inteiro em cache), não há I/O de disco e nenhuma latência anômala foi medida (0,5–2,5 ms nas formas testadas). **Risco real**: é trabalho desperdiçado que escala com o crescimento da tabela (quando a coleta de preço voltar, a tabela cresce e o custo desses scans cresce junto). A identificação exata do caller ficou inconclusiva nesta janela (as formas observadas no Kong — Shape A e canonical — foram medidas e **não** são as que fazem o full scan). **Ação recomendada**: amostrar `pg_stat_user_indexes` + `pg_stat_statements` num intervalo maior (ex.: 1 h) e correlacionar com os shapes do Kong para achar o caller; se for uma consulta com range aberto (`recorded_at` sem limite inferior), corrigir o chamador — não o índice.
2. **Kong permanece no teto de memória (~85% de 512 MiB) — pré-existente, não causado por esta mudança.** A margem é pequena e o log `json-file` sem rotação já tem **2,8 GB** em um host sem swap. Um novo evento de memória no Kong reproduziria os 502/503/504 *independentemente* da correção do banco. Segue **pendente de aprovação** (item 6.3 do relatório de execução).
3. **`exchange_rates` continua vazia (0 linhas)** — os fluxos de câmbio operam em fallback/degradado. Não é regressão desta mudança, mas segue sem investigação (fora do escopo autorizado).
4. **Deploys de Preview seguem quebrados** (item 7 abaixo) — impede revisão visual por PR e qualquer verificação em ambiente isolado antes de produção.
5. **O container órfão `dreamy_hodgkin`** (postgres:17.6 desde 26/Aug) segue rodando, consumindo 31 MiB e criando ambiguidade operacional.

---

## 7. PREVIEW VERCEL — `NEXT_PUBLIC_SUPABASE_URL` ausente

### Diagnóstico do impacto

- Os **dois** builds de Preview do branch (`fea765f` e `277b44b`) falharam com:
  `Error: Failed to collect configuration for /_not-found` → `Variável de ambiente ausente: NEXT_PUBLIC_SUPABASE_URL. Configure … (Production/Preview) e refaça o deploy.`
- Impacto: **nenhum PR consegue gerar preview**, os aliases por branch (`fronteiraai-git-<branch>-…`) não constroem, e não existe hoje nenhum ambiente isolado para validar antes de produção. **Production não é afetado** (por isso os deploys de `main` funcionam).
- **Pré-existente**: independente das Missions 05/05.1/05.2 (nenhuma tocou configuração de ambiente).

### Configuração localizada

`npx vercel env ls` mostra que **todas as 5 variáveis existem apenas no escopo Production**:

| Nome | Escopos |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Production** |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Production** |
| `NEXT_PUBLIC_SITE_URL` | **Production** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production** |
| `CRON_SECRET` | **Production** |

Fonte na aplicação: `lib/env.ts` — o build **exige** (throw em tempo de coleta de configuração):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` e, com `NODE_ENV=production`, também `NEXT_PUBLIC_SITE_URL`.
`SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` **não** são exigidos pelo build — são necessários em **runtime** (rotas/caminhos que usam o client de service role e as rotas `/api/cron/*`).

### Solução proposta (não aplicada)

**Passo 1 — destrava o build (seguro):** adicionar ao escopo **Preview** as três variáveis públicas, com os mesmos valores de produção:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL`.
São públicas por definição (a `anon key` é protegida por RLS; as duas estão no bundle do cliente). Com isso, Preview passa a construir e a renderizar as superfícies públicas.

**Passo 2 — só com proteção de deployment ligada (decisão sua):** `SUPABASE_SERVICE_ROLE_KEY` e `CRON_SECRET` em Preview **somente se** os deployments de Preview estiverem protegidos (Vercel → Settings → Deployment Protection / Vercel Authentication). Motivo: um Preview público com a service-role key expõe superfícies SSR que **ignoram RLS** — qualquer pessoa com a URL poderia abusar das rotas que usam `getSupabaseServiceClient()`. Sem essa proteção, o correto é manter Preview sem essas duas chaves e aceitar degradação parcial (páginas que dependem de service role não renderizam dados).

**Passo 3 (estrutural, opcional):** um backend de staging dedicado. Hoje **não existe** — a lacuna está registrada em `.github/workflows/database.yml` ("one Supabase project, not a separate staging + production pair"). Preview + Production compartilhando o mesmo banco self-hosted significa que um Preview escreveria no banco de produção; se isso for inaceitável, o passo 3 passa a ser pré-requisito do passo 2.

**Alternativa mínima:** se o objetivo é apenas permitir revisão visual de UI, um projeto Vercel separado (ou "Ignored Build Step"/`vercel build` local) evita mexer em escopos de segredos — mais trabalho, menos risco.

---

## RECOMMENDED NEXT ACTION

1. **Aguardar e executar a validação da janela** (2026-10-01 ~07:54 UTC) com o bloco PENDENTE_JANELA acima — é o único item que falta para fechar a Mission 05.3. Nenhuma ação de produção necessária antes disso.
2. **Aplicar o Passo 1 do item 7** (3 variáveis públicas no escopo Preview) — baixo risco, destrava PR previews e revisão visual. Requer sua aprovação explícita (mexe em configuração do projeto).
3. **Decidir sobre o PGRST_DB_POOL**: recomendação técnica mantida — **não aplicar** (após o índice o pool opera em ~3% da capacidade; a evidência desta sessão reforça: 13 conexões de 100, 1 ativa).
4. **Investigar o risco #1** (full index scan ~3×/min) em uma janela maior de amostragem — sem pressa, sem impacto medido hoje, mas é crescimento futuro.
5. **Segurança/operação (fora do escopo das Missões 05.x, precisam de decisão)**: rotação do log do Kong, remoção do container órfão `dreamy_hodgkin`, investigação da tabela `exchange_rates` vazia, criação do ambiente de staging.
