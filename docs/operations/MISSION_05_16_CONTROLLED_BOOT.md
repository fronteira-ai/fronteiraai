# MISSION 05.16 — FLUENCE VPS: BOOT CONTROLADO DO FRONTEND

**Categoria**: `docs/operations/`
**Branch**: `mission-05-16-controlled-boot` (de `dcbc03c`, que incorpora a 05.14/05.15)
**Natureza**: **primeira execução real** do frontend no VPS, exclusivamente em `127.0.0.1:3100`. `origin/main` não modificado; DNS/Caddy/Supabase/PostgreSQL/Kong/Auth/Storage/backup/timers/crons intocados; nenhuma rota de escrita/cron/sincronização chamada; nenhum ISR de 300 s; nenhuma credencial nova criada.

## RESULTADO: **BOOT CONTROLADO BEM-SUCEDIDO**

| Critério | Resultado |
|---|---|
| Frontend saudável, sem reinicializações | ✅ `Up (healthy)`, **restarts = 0** |
| Rotas essenciais respondendo | ✅ **todas 200** (ver smoke) |
| Só em loopback | ✅ `127.0.0.1:3100->3100/tcp` (nenhuma exposição pública) |
| **Stack Supabase intacto** | ✅ **8 containers `Up 7 days (healthy)`**, nenhum reinício |
| **Sem regressão no banco** | ✅ `57014` **1.169 → 1.169** · `PGRST003` **67 → 67** · conexões **3 → 4** |
| Consumo dentro do teto | ✅ **86,9 MiB / 1 GiB** (0,00% CPU em repouso) |

---

## 1. SEGURANÇA DO BUILD

- **Nenhuma credencial foi criada.** `/etc/paraguai/app.env` (`root:root 0600`) foi montado **reutilizando** valores já existentes no host (`/opt/supabase-stack/docker/.env`): `ANON_KEY` (170 B) → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY` (181 B) → `SUPABASE_SERVICE_ROLE_KEY`, `API_EXTERNAL_URL` (prefixo `https://`) → `NEXT_PUBLIC_SUPABASE_URL`, além de `NEXT_PUBLIC_SITE_URL` e `SELF_HOSTED_IMAGES_UNOPTIMIZED=1`. **Nenhum valor foi impresso** em nenhum momento (verificações só por nome/contagem/prefixo).
- **`CRON_SECRET` NÃO foi criado** (`grep -c '^CRON_SECRET=' → 0`) — as rotas de cron não foram chamadas.
- **Código transferido por `git archive` do commit** `dcbc03c` (2.338 entradas → 1.776 arquivos extraídos). Isso garante que **nenhum arquivo não commitado** (em especial as alterações da **Mission 04** em `app/sitemap.ts` etc.) chegou ao VPS, e que `.env.local`/`.env.local.legacy-rollback` (untracked) **não** foram transferidos. Os únicos `.env*` no destino são os dois `.example` rastreados, com **0 JWTs**.
- `/opt/paraguai` (usado por 5 units systemd de produção) **não foi tocado**: verificado `backup.sh` presente e diretório intacto.
- A imagem final contém apenas `.next/standalone` + `.next/static` + `public`; a busca por `.env*` dentro da imagem não retornou nada.

### 1.1 DESCOBERTA CRÍTICA — o build precisa da `SUPABASE_SERVICE_ROLE_KEY`

A primeira tentativa de build **falhou** (5m43s) com o erro real de execução:

```
Error occurred prerendering page "/"
Error: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para operações administrativas.
```

**Causa**: `/` é **prerenderizada no build** (ISR `revalidate = 60`) e o caminho de dados da home usa o client de **service role**. Ou seja, o build **não** precisa apenas das `NEXT_PUBLIC_*` — precisa também do segredo. É a **mesma classe de falha** que derrubou os Preview builds na Vercel (Mission 05.3: `NEXT_PUBLIC_SUPABASE_URL ausente`).

**Correção aplicada** (branch): as variáveis passam a entrar por **BUILD SECRET do BuildKit**, não por `ARG`/`ENV`:

```dockerfile
RUN --mount=type=secret,id=app_env,target=/tmp/app.env \
    set -a && . /tmp/app.env && set +a && NEXT_TELEMETRY_DISABLED=1 npm run build
```
```yaml
build: { secrets: [app_env] }        # em docker-compose.app.yml
secrets: { app_env: { file: /etc/paraguai/app.env } }
```
Segredo em `ARG` apareceria em `docker history` e em camada; **build secret não fica no histórico nem na imagem** — e o arquivo é o **mesmo** de runtime, sem duplicar custódia. O build seguinte **passou**.

---

## 2. BUILD NO VPS (medido)

| Métrica | Valor |
|---|---|
| Tentativa 1 (sem a chave) | 5m43s → **falhou** (prerender de `/`) |
| Tentativa 2 (com build secret, `npm ci` em cache) | **3m53s** → `Image paraguai-web:latest Built` |
| **Tamanho da imagem** | **351 MB** (85,5 MB comprimida) — dentro da estimativa (250–400 MB) |
| RAM do host durante o build | 1.509 → 1.563 MB usados; **nunca faltou memória** (available ≥ 1,4 GB) |
| Disco após build+imagem | 23 GB → **26 GB** usados (65 GB livres) |

**Achado operacional**: no VPS o build é **~5× mais lento que localmente** (≈12 s de compilação lá vs 3m53s no VPS com `npm ci` em cache, incluindo ~100 s de typecheck e a geração de 150 páginas). Isso é relevante para planejar deploys futuros (janela calma, build serializado).

---

## 3. SMOKE TESTS (read-only, loopback)

| Rota | HTTP | Tempo |
|---|---|---|
| `/` | **200** | 0,12 s |
| `/products` | **200** | **4,13 s** ⚠️ |
| `/search?q=perfume` | **200** | 0,34 s |
| `/lojas` | **200** | 0,13 s |
| `/product/iphone-16-pro-256gb-titanio-preto` | **200** | 0,48 s |
| `/robots.txt` | **200** | 0,02 s |
| `/sitemap.xml` | **404** (esperado — o índice canônico é `/sitemap/static.xml`, conforme o próprio `robots.txt`) | 0,07 s |
| `/api/exchange/current` | **200** | 0,08 s |
| `/api/exchange/health` | **200** | 0,05 s |
| 2ª rodada (`/`, `/products`, `/search`) | **200 / 200 / 200** | estável |

**Leitura pública REAL na API** (não apenas o 401): requisição **com a anon key** de dentro do container retornou **linhas reais** (`[{"id":"9e3083f7-…"},{"id":"1a56c762-…"}]`) ⇒ credencial, rede, Caddy e PostgREST funcionam de ponta a ponta a partir do frontend self-hosted.

---

## 4. ERROS OBSERVADOS NO RUNTIME (registrados, não mascarados)

Ambos são **comportamentos pré-existentes da aplicação**, revelados pela primeira execução real — nenhum é causado pelo container:

1. `⨯ Error: Não foi possível completar a busca. Tente novamente.` → coerente com o achado das Missões 05.8/05.12: a RPC `search_products_global` leva **3,45 s** e **excede o `statement_timeout` de 3 s do papel `anon`**; a página degrada para resultado vazio (por isso `/search` respondeu **200** mesmo com o erro logado).
2. `[stores-public] store query: 404 page not found` → consulta de lojas recebendo **404 do PostgREST**. Hipótese (não confirmada nesta missão): caminho/tabela/coluna que existe no baseline do cloud e não no schema atual, ou padrão de consulta não suportado. `/lojas` respondeu **200** (degradação), então não quebra a navegação — **investigação recomendada**.

---

## 5. MEDIÇÕES E INTEGRIDADE

| Item | Antes (baseline 16:15) | Depois (16:27) |
|---|---|---|
| Containers | 8 `healthy` | **9** (`paraguai-web` + os 8, todos `healthy`; os Supabase seguem `Up 7 days`) |
| Conexões PostgreSQL | 3 | **4** |
| `57014` / `PGRST003` | 1.169 / 67 | **1.169 / 67** (inalterados) |
| RAM do host | 1.433 MB usados | 1.666 MB usados / **5.283 disponíveis** |
| Disco | 23 GB (26%) | 26 GB (28%) |
| `load average` | 0,74 / 0,77 / 0,82 | **1,96 / 2,99 / 2,21** (inclui o build e o smoke; 4 vCPU) |
| Frontend | — | **86,9 MiB / 1 GiB**, CPU 0,00% em repouso, health `healthy`, **restarts 0** |

**Conclusão de integridade**: nenhum serviço existente foi perturbado durante build + boot.

---

## 6. ESTADO ATUAL E ROLLBACK

**O frontend está RODANDO em `127.0.0.1:3100`** (não público — nenhum DNS/Caddy alterado), com ~87 MB e 0% de CPU em repouso. A decisão de mantê-lo de pé é para não perder o estado validado; a parada é de um comando:

```bash
cd /opt/paraguai-app && sudo docker compose -f infra/selfhosted/app/docker-compose.app.yml down
```
**Rollback comprovadamente seguro**: o `down` afeta **apenas** o container do frontend — o stack Supabase tem projeto/rede próprios e permaneceu intacto durante todo o exercício. Nenhum dado é criado ou alterado (o PostgreSQL só recebeu leituras), nenhum arquivo de produção de outro serviço foi tocado, e `/opt/paraguai` está intacto.

---

## 7. PENDÊNCIAS

| # | Pendência | Impacto |
|---|---|---|
| P1 | `/products` em **4,13 s** (RPC de catálogo ~505 ms + montagem da página) | experiência ruim e CPU alta; alvo natural das Missões 05.6/05.7 |
| P2 | Erro da busca (`search_products_global` > timeout de 3 s do `anon`) | `/search` degrada para vazio — mesma causa medida na 05.8 |
| P3 | `[stores-public] … 404` | investigar (possível divergência de schema/caminho entre cloud e self-hosted) |
| P4 | `CRON_SECRET` não existe no host | os 3 crons diários ainda dependem da Vercel; criar exige autorização |
| P5 | `EXCHANGE_RATE_API_KEY` ausente em todo lugar | câmbio em fallback (Mission 05.4) |
| P6 | Caminho de deploy do código (hoje: `git archive` + `scp` manual) | precisa de decisão (deploy key/CI/script) |
| P7 | Exposição pública (Caddy + DNS) | **NÃO autorizada nesta missão**; exige aprovação |
| P8 | Política de cache/frescor (05.14 §3) | não aplicada (proibido aqui); necessária antes de expor |

## 8. GO / NO-GO

- **GO** — o boot controlado **passou** em todos os critérios: saudável, sem reinícios, rotas essenciais 200, leitura pública real autenticada funcionando, stack Supabase intacto e **zero regressão** de `57014`/`PGRST003`/conexões. A correção do build (build secret com a service-role key) está aplicada e reproduzível.
- **GO condicional** para o próximo passo (exposição via Caddy/DNS): depende de (a) decisão sobre a política de frescor/cache (P8) — o app está hoje **totalmente dinâmico**, e a contenção de CPU app×banco é o risco principal; (b) resolução de P6 (deploy reprodutível); (c) aprovação explícita de DNS/Caddy.
- **NO-GO** para: expor publicamente agora, aplicar cache de 300 s, criar `CRON_SECRET`/`EXCHANGE_RATE_API_KEY` sem autorização, apontar DNS, ou mexer em qualquer serviço do stack.
