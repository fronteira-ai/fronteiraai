# MISSION 05.18 — VPS PRODUCTION READINESS

**Categoria**: `docs/operations/`
**Branch**: `mission-05-18-vps-production-readiness` (de `mission-05-17-pre-cutover-stabilization` @ `2733efb`)
**Base preservada**: `origin/main` = `c43538b`; Mission 04 intacta (5 arquivos, nenhum tocado).
**O que NÃO foi feito (por escopo)**: nenhum cron executado, nenhum secret criado, nenhum timer instalado, nenhum deploy/merge, nada alterado no container em execução, no banco, no Docker, no Caddy ou no DNS. Todos os artefatos desta missão são **preparação**: scripts e units revisados estaticamente, **nunca executados**.

---

## 1. CRONS — mapa, necessidade, agendamento atual e risco de duplicação

### 1.1 Os 7 endpoints (todos `GET`, todos autenticados)

| Endpoint | Auth | Cadência atual | Agendador hoje | Necessário? |
|---|---|---|---|---|
| `/api/cron/exchange/refresh` | `requireCronSecret` | `*/5` | GHA `high-frequency-crons.yml` | **Sim** — é o único caminho que popula `exchange_rates` (hoje com 0 linhas) |
| `/api/cron/realtime-commerce/market-pulse` | `requireCronSecret` | `*/15` | GHA | Sim (realtime-commerce é feature ativa) |
| `/api/cron/realtime-commerce/buyer-alerts` | `requireCronSecret` | `*/15` | GHA | Sim |
| `/api/cron/canonical-catalog/merge-suggestions` | `requireCronSecret` | `*/15` | GHA | Sim (catálogo canônico) |
| `/api/cron/connectors/sync` | `requireCronSecret` | `*/15` **e** diário 06:00 | **GHA e vercel.json** | Sim — roda **somente conectores DUE** (idempotente por desenho) |
| `/api/cron/marketplace-operations/snapshot` | `requireCronSecret` | diário 07:00 | vercel.json | Sim |
| `/api/cron/canonical-catalog/outbox-maintenance` | `requireCronSecret` | diário 03:00 | vercel.json | Sim (manutenção de outbox) |

Verificado no código: cada rota chama `requireCronSecret()` (2 ocorrências por arquivo: import + uso) — `lib/cron-auth.ts`, comparação **timing-safe** (`timingSafeEqual`) e **fail-closed** (sem `CRON_SECRET` ⇒ 401).

### 1.2 Agendadores existentes (medido, read-only)

| Agendador | Estado real |
|---|---|
| `vercel.json` | 3 rotas diárias. **Hoje não rodam**: a conta Vercel está suspensa (`402 DEPLOYMENT_DISABLED`) |
| `.github/workflows/high-frequency-crons.yml` | 4 rotas (`*/5`, `*/15`); exige `secrets.CRON_SECRET` + `vars.CRON_APP_URL`; se faltarem, emite `::warning::` e **não dispara nada** |
| **VPS** — `systemctl list-timers` | Somente `paraguai-backup.timer` (a cada 3 dias, 03:31) e `paraguai-healthcheck.timer` (horário). **Nenhum** unit/timer/cron chama `/api/cron` (verificado por grep em `/etc/systemd/system`, `/etc/cron.d`, `/opt/paraguai/infra`) |
| `/etc/cron.d`, `/etc/cron.daily` | Só pacotes do sistema (`e2scrub`, `apport`, `apt-compat`, `dpkg`, `logrotate`, `man-db`) |

**Conclusão**: **não existe duplicação hoje** (o VPS não agenda nada). O risco de duplicação aparece **exatamente no momento da migração**, se o novo agendador for ligado sem desligar GHA/`vercel.json` — e é **assimétrico**: se `connectors/sync` rodar duas vezes em paralelo, é inofensivo (só conectores DUE), mas `exchange/refresh`, `market-pulse` e `buyer-alerts` **gravam linhas/entregam notificações** e podem duplicar efeitos. Por isso a ordem abaixo é obrigatória.

### 1.3 Migração preparada (sem executar tarefas)

Artefatos criados (revisados, **não instalados**):
- `infra/selfhosted/app/cron/run-crons.sh` — decide **quais** endpoints rodam a cada disparo (`*/5` câmbio; `*/15` tempo real + merge + sync; diários 03:00/07:00), chama com `Authorization: Bearer $CRON_SECRET` lido de `/etc/paraguai/app.env`, loga `http=` por endpoint e usa `logger -t paraguai-cron` em falha. Modos: `due` (systemd) e `all` (diagnóstico manual).
- `infra/selfhosted/app/cron/paraguai-crons.service` (`Type=oneshot`, `User=root` **somente** porque o env é 0600, `Nice=10`, `TimeoutStartSec=300`) e `paraguai-crons.timer` (`OnCalendar=*:0/5`).

**Ordem de ativação (a executar em missão futura)**:
1. Criar `CRON_SECRET` (§3) e confirmar `curl` autenticado devolvendo 200 numa rota inócua (`exchange/refresh` — sem efeito colateral destrutivo).
2. Instalar as units e habilitar **só o timer**; observar 1 hora de logs (`journalctl -u paraguai-crons`).
3. **Só então** remover os disparos da Vercel: esvaziar o array `crons` do `vercel.json` e desativar o workflow `high-frequency-crons.yml` (ou apontar `CRON_APP_URL` para o VPS **de uma única vez**, nunca manter os dois apontando para hosts distintos).
4. Ajustar `docs/engineering/CRON_INFRASTRUCTURE.md` — **documentação desatualizada**: o doc (2026-07-06) fala de **5 rotas** e diz que `vercel.json` mantém **2** diárias; hoje são **7 rotas** e o `vercel.json` tem **3** entradas (`outbox-maintenance` entrou depois). Corrigir junto com a migração.

---

## 2. CÂMBIO — fonte, alternativas e procedimento

### 2.1 O que o código realmente suporta (verificado)

| Provider registrado | Variável exigida | Endpoint |
|---|---|---|
| `ExchangeRateApiProvider` (id `exchangerate-api`) | **`EXCHANGE_RATE_API_KEY`** | `https://v6.exchangerate-api.com/v6/<key>/latest/USD` |
| `OpenExchangeRatesProvider` | **`OPEN_EXCHANGE_RATES_APP_ID`** | (openexchangerates.org) |

`src/domains/exchange/providers/bootstrap.ts` registra os dois; o comentário do registry diz explicitamente que **acrescentar um provider é puramente aditivo** — logo uma terceira fonte (inclusive sem chave) é uma mudança pequena e isolada. Pares que o produto precisa: **`usdBrl` e `usdPyg`** (`lib/home-premium-service.ts:368-369`).

### 2.2 Causa comprovada do câmbio parado (duas, independentes)

1. **Nenhuma chave existe**: `EXCHANGE_RATE_API_KEY` e `OPEN_EXCHANGE_RATES_APP_ID` não existem em `/etc/paraguai/app.env`, em `/opt/supabase-stack/docker/.env` nem em `/etc/paraguai/backup.env` (verificado por nome; nenhum valor lido).
2. **Nada agenda o refresh no VPS**: `exchange/refresh` só era disparado pelo GHA (`*/5`), que depende de `vars.CRON_APP_URL` apontando para a Vercel — suspensa. Resultado medido: `exchange_rates` com **0 linhas** (Mission 05.17), com o schema **correto** para o que o código lê (`pair, rate, source, captured_at`) — **não** é problema de schema.

### 2.3 Alternativas avaliadas (nenhuma credencial criada; nada inventado)

| Opção | Custo | Cobre USD→PYG? | Avaliação |
|---|---|---|---|
| **A — `exchangerate-api.com`** (provider já implementado) | chave gratuita com limite mensal | sim | **Caminho de menor esforço**: já existe código. Requer **uma** credencial nova — exige autorização explícita (fora do escopo desta missão) |
| **B — `openexchangerates.org`** (provider já implementado) | app id gratuito (tier limitado) | sim | Mesma classe da A; útil como **segunda fonte** para reconciliação |
| **C — fonte sem chave** (ex.: Banco Central do Paraguai / rate pública) | nenhuma | sim (BCP publica referência PYG) | Exige **um provider novo** (~40 linhas, aditivo) + cron; **a validar em missão própria** — não testei nenhum endpoint externo a partir da produção |
| **D — inserção humana verificada** | nenhuma | sim | Operador insere a taxa **de uma fonte oficial**, sem qualquer valor inventado. É o *fallback* honesto enquanto A/B/C não existirem |

**Procedimento para popular `exchange_rates` (quando A ou B for autorizada)**: (1) gravar a chave em `/etc/paraguai/app.env` (`0600 root:root`, fora do Git); (2) `docker compose ... up -d` (recria o container com o novo env — **esta é a única ação que exige o stack em produção**, portanto é decisão de missão futura); (3) disparar `exchange/refresh` **uma vez** com o segredo; (4) validar com `SELECT count(*), max(captured_at) FROM exchange_rates` e `curl -s http://127.0.0.1:3100/api/exchange/current` (deve devolver `usdBrl`/`usdPyg`). Nenhuma taxa foi inventada e nenhuma credencial foi criada nesta missão.

**Risco aberto (produto)**: com a tabela vazia, qualquer conversão de preço exibida cai em fallback — decidir com o CTO se o site deve **ocultar** conversão até haver taxa (`transparência > estimativa`) ou manter o fallback atual.

---

## 3. SEGURANÇA — `CRON_SECRET`, autenticação e exposição

### 3.1 O que já está correto (verificado no código)

- **7/7** rotas de cron autenticadas por `requireCronSecret()` — **fail-closed** (sem `CRON_SECRET` configurado, 401) e **timing-safe** (`timingSafeEqual`, comparação de tamanho separada), sobre `Authorization: Bearer <secret>`.
- **Nenhuma** rota de cron é acessível sem o segredo; hoje elas **não são públicas de todo modo** (o compose publica apenas `127.0.0.1:3100`; o Caddyfile serve **somente** `api.fronteiraai.com → 127.0.0.1:8000`).

### 3.2 O que muda no cutover e o que preparar

Quando o Caddy passar a publicar o hostname do site, `/api/cron/*` fica alcançável pela internet — protegido **apenas** pelo segredo. Preparação (a executar em missão futura):

1. **Criar o segredo**: `openssl rand -hex 32` (256 bits) → gravar **somente** em `/etc/paraguai/app.env` (`0600 root:root`), nunca em `vercel.json`, unit systemd, Git ou argumento de linha de comando.
2. **Defesa em profundidade no Caddy** (recomendada): negar `/api/cron/*` na borda pública — os crons passam a ser disparados **por loopback**, então a rota não precisa ser alcançável de fora:
   ```caddy
   www.fronteiraai.com {
       @cron path /api/cron/*
       respond @cron 404            # não revela que a rota existe
       reverse_proxy 127.0.0.1:3100
   }
   ```
3. **Rotação**: se o segredo vazar, recriar + `up -d` (o `env_file` é lido no start) e reconfigurar o agendador. Sem impacto em dados.
4. **Não usar** o segredo em query string (`?secret=`) — o agendador envia **header** (confirmado em `run-crons.sh`) e só ele é usado; headers não vão para logs de acesso.

---

## 4. DEPLOY — procedimento reproduzível, versão, rollback e preservação do stack

**Artefato**: `infra/selfhosted/app/deploy.sh` (`--status` / padrão / `--rollback`).

| Requisito | Como é atendido |
|---|---|
| **Versão identificável** | imagem marcada `paraguai-web:<sha-curto>` + `paraguai-web:previous` (a que estava no ar) + `sha` gravado em `/opt/paraguai-app/.deployed-commit`; `--status` mostra imagem no ar, commit registrado, health e restarts |
| **Reproduzível** | build a partir do commit do checkout (`npm ci` + `next build`), recusando-se a operar com checkout sujo (avisa; o deploy não reflete mudanças não commitadas) |
| **Rollback** | `--rollback` = **retag da `:previous` + `up -d`, sem rebuild** (segundos, não minutos), seguido dos mesmos gates |
| **Preservação do stack Supabase** | o script usa **um único** compose (`infra/selfhosted/app/docker-compose.app.yml`) e nunca referencia os compose do Supabase; o projeto/rede do frontend é independente — mesma separação que já se comprovou segura nas Missões 05.16/05.17 |
| **Gates antes de considerar pronto** | `health_gate` (espera `healthy` até 120 s) → `smoke_gate` (`/`, `/products`, `/lojas`, `/robots.txt`, `/api/exchange/health` todos 200) → `warm_up` (`/`, `/products`, `/lojas`, `/search?q=perfume`) para **eliminar o cold start** de ~4 s medido na 05.17 |
| **Compose** | `image:` passou a `${APP_IMAGE:-paraguai-web:latest}` — o default preserva o comportamento atual, e o script pina a tag por deploy |

**Riscos declarados**: (a) o build consome **3–6 min** e ~1–2 GB de RAM nesta máquina de 4 vCPU — rodar em janela calma e **nunca** durante backup (03:31) ou pico; (b) `deploy.sh` foi revisado estaticamente e **nunca executado** (sem Docker na máquina de desenvolvimento) — a primeira execução deve ser tratada como ensaio, com `--status` antes e `--rollback` à mão; (c) `docker compose build` não herda `nice`; se necessário, envolver em `nice -n 10 ionice -c2 -n6`.

---

## 5. CACHE — implementação mínima definida (não aplicada)

**Objetivo**: cortar invocações repetidas do banco **sem** jamais servir preço/câmbio velho. Medições que delimitam o problema (05.17): RPC de catálogo = **0,52–0,58 s** de PostgreSQL+PostgREST por chamada; `/products` a quente TTFB **0,06–0,10 s** (logo a RPC **não** é reexecutada em cache hit); o custo real de banco está na **primeira** requisição e nas leituras de preço.

**Implementação mínima (3 mudanças, nenhuma toca preço)**:
1. **Cachear só leituras sem preço** — ranking de lojas (`getStoresRanking`), categorias/marcas e contagens de faceta. Nunca `offers`, `price_history` nem `exchange_rates`.
2. **Invalidar por tag, por evento** — cada leitura cacheada declara uma tag (`catalog:stores`, `catalog:facets`) e o **fim** de `connectors/sync` chama `revalidateTag(...)`. Sem TTL arbitrário; nada de 300 s em preço.
3. **`/products` permanece dinâmico** até que a listagem seja **separada** em "casca" (produto/marca/imagem — cacheável) e "melhor preço" (dinâmico). Enquanto as duas coisas vierem na mesma resposta, cachear a página = servir preço velho.

**API**: usar o que esta versão realmente oferece — o bundle documenta **Cache Components** (`node_modules/next/dist/docs/08-caching.md`, `09-revalidating.md`, `15-route-handlers.md`). **Antes de escrever código**: conferir nesses arquivos o par exato `use cache`/`cacheLife`/`cacheTag` (e o flag de `next.config.ts`) para Next **16.2.9** — a API de cache mudou em relação ao `unstable_cache` que eu conheço.
**Critério de aceitação mensurável**: `pg_stat_statements` — chamadas/min da RPC de catálogo e de `stores` antes/depois, com a meta de reduzir invocações **sem** alterar o tempo de frescor de preço exibido.
**Decisão desta missão**: **definir, não aplicar** — (a) a política ainda precisa da aprovação D8 (produto/SEO); (b) qualquer mudança de cache só é validável com um deploy, e deploy está fora do escopo. A regra de ouro registrada: **preço e câmbio invalidam por evento; o que é editorial cacheia por TTL.**

---

## 6. DEPENDÊNCIAS PARA PUBLICAÇÃO E GO/NO-GO

| # | Dependência | Bloqueia publicar? |
|---|---|---|
| D3 | `CRON_SECRET` (criar, 256 bits, em `/etc/paraguai/app.env` 0600) | Sim, se os crons forem self-hosted |
| D4 | Instalar `paraguai-crons.timer` **e** desligar Vercel/GHA (nunca os dois) | Sim |
| D5 | Fonte de câmbio (A/B/C/D) + decisão de produto sobre exibir conversão sem taxa | Sim (afeta preço exibido) |
| D6 | Corrigir `CRON_INFRASTRUCTURE.md` (5→7 rotas, 2→3 no vercel.json) | Não, mas é dívida de documentação |
| D7 | `deploy.sh` já existe → falta **ensaiar** (primeira execução supervisionada) | Sim (operacional) |
| D8 | Aprovação da política de cache (§5) | Sim |
| D1/D2 | Warm-up pós-deploy (já embutido no `deploy.sh`) | Mitigado |
| D9 | Caddy + DNS (hostname do site) + regra de negação de `/api/cron/*` | É o próprio cutover |
| D10 | Rotação do log do Kong (4,3 GB, sem `max-size`) e monitoramento de CPU/erros do frontend | Recomendado antes de tráfego real |

**GO** — prontidão preparada e verificada: os 7 crons estão mapeados, autenticados e com agendador self-hosted pronto para instalar; o câmbio tem causa comprovada (dupla) e quatro caminhos de correção sem nenhum valor inventado; o segredo de cron tem procedimento de criação, custódia e defesa em profundidade; o deploy é reproduzível, versionado e com rollback de segundos que **não toca** o stack Supabase; e o cache está **definido** com a fronteira certa (nada de TTL em preço).
**GO CONDICIONAL para o cutover** — exige D3, D4, D5, D7 (ensaio), D8 e D9.
**NO-GO nesta missão** para: instalar timers, criar secrets, executar crons, alterar Caddy/DNS/Docker, aplicar cache, deploy ou merge. **Nada fora desta branch foi alterado.**

**Limitações declaradas**: sem Docker na máquina de desenvolvimento, `deploy.sh` e as units do systemd foram **revisados, não executados**; nenhum endpoint externo de câmbio foi consultado (nenhuma validação *live* das opções B/C/D); a auditoria do host foi read-only (`systemctl list-timers`, grep em `/etc`, leitura do Caddyfile).
