# MISSION 05.20 — FASE B: DEPLOY VERSIONADO E VALIDAÇÃO OPERACIONAL

**Categoria**: `docs/operations/`
**Branch**: `mission-05-20-controlled-cutover` (base `14b6a3b`; deploy desta fase = **`a2fcec0`**)
**Autorização cumprida**: construído e implantado **somente** `paraguai-web` em `127.0.0.1:3100`; smoke e warm-up de leitura; teste do provedor keyless **sem gravar** no banco; `deploy.sh`/versão/rollback/métricas validados; falhas corrigidas na branch.
**Proibições respeitadas**: nenhum DDL/DML (`exchange_rates` = **0** antes e depois), **nenhum** dos 7 crons executado, nenhum timer instalado, GitHub Actions/Caddy/DNS/Kong/banco/Supabase e `origin/main` **inalterados**. Domínios **não** publicados.

---

## B.2 Integridade do código antes do deploy

| Verificação | Resultado |
|---|---|
| sha256 dos artefatos no VPS vs branch | **idênticos** — `deploy.sh ef6786776e99`, `run-crons.sh fdb79e573eb1`, `KeylessExchangeRateProvider.ts d6d8c2280f6c` |
| Arquivos no checkout `/opt/paraguai-app` | 1787 |
| `.git` existe? | **NÃO** |

**Defeito encontrado e corrigido (commit `a2fcec0`)**: como o checkout é um conteúdo extraído de `git archive` e **não** um repositório, o `deploy.sh` anterior **morreria** em "não foi possível determinar o commit" — o deploy versionado nunca aconteceria. Agora o git tem precedência quando existe, e na ausência dele a versão vem de `.source-commit` (gravado na transferência com o `git rev-parse` da máquina que publica); a checagem de "checkout sujo" só roda quando há `.git`.

## B.1 Baseline (pré-deploy, 18:48 UTC) × B.7 pós-deploy (18:54 UTC)

| Métrica | Pré-deploy | Pós-deploy | Leitura |
|---|---|---|---|
| Containers | 9 `healthy` | **9 `healthy`** (os 8 Supabase seguem `Up 7 days`) | stack intacto |
| `load average` | 1,15 | 2,35 (build + validação, em queda) | pico transitório |
| RAM usada / livre | 1.638 / 4.487 MB | 1.740 / 4.288 MB | +102 MB durante build+smoke |
| **Conexões PostgreSQL** | **3** | **3** | **sem aumento** |
| `xact_commit` | — | 11.130.531 (Δ +829 em ~6 min, inclui o prerender do build) | trivial |
| `PGRST003` / `57014` | 67 / 1.169 | **67 / 1.169** | **nenhum erro novo** |
| `paraguai-web` | 85,68 MiB / 1 GiB, 0% CPU | **89,04 MiB / 1 GiB, 0,53% CPU** | dentro do teto |
| `supabase-db` | 264,2 MiB / 3 GiB | 238,2 MiB / 3 GiB | sem pressão |
| `exchange_rates` | 0 | **0** | nenhuma escrita (regra honrada) |

## B.3 Deploy versionado (supervisionado)

```
18:50:01 deploy do commit a2fcec0
18:50:01 preservado como paraguai-web:previous (paraguai-web:latest)
18:50:01 build paraguai-web:a2fcec0 …  → Image paraguai-web:a2fcec0 Built  (197 s)
          Container paraguai-web Recreate → Recreated → Starting → Started
18:53:59 health=healthy
18:54:02 DEPLOY CONCLUÍDO — paraguai-web:a2fcec0 em 127.0.0.1:3100
DEPLOY_EXIT=0
```

Build com `npm ci` em cache: **197 s** (Compiled 75 s, TypeScript 97 s, 148 páginas). Imagem **351 MB**.

## B.4 Versão, saúde e ausência de segredos na imagem

| Verificação | Resultado |
|---|---|
| Imagem no ar | **`paraguai-web:a2fcec0`** (commit registrado: `a2fcec0`) |
| Saúde | `health=healthy`, **restarts=0** |
| `.env*` dentro da imagem | **nenhum** (`find / -maxdepth 5 -name ".env*"` → vazio) |
| Variáveis embutidas na imagem | `PATH NODE_VERSION YARN_VERSION NODE_ENV PORT HOSTNAME NEXT_TELEMETRY_DISABLED SELF_HOSTED_IMAGES_UNOPTIMIZED` — **nenhum segredo** |
| Segredos | continuam apenas em `/etc/paraguai/app.env` (600 root:root), fora do Git e nunca impressos |

## B.5 Smoke tests (todos em loopback)

| Rota | HTTP | Tempo |
|---|---|---|
| `/` | **200** | 0,036 s |
| `/products` | **200** | **2,225 s** ⚠️ |
| `/categorias` | **200** | 0,346 s |
| `/lojas` | **200** | 0,119 s |
| `/lojas/cellshop` | **200** | 0,218 s |
| `/product/iphone-16-pro-256gb-titanio-preto` | **200** | 0,142 s |
| `/search?q=perfume` | **200** | 0,194 s |
| `/robots.txt` | **200** | 0,021 s |
| `/sitemap.xml` | 404 | 0,080 s — **esperado**: o índice canônico do Next é `/sitemap/[__metadata_id__]` → `/sitemap/0.xml` (visível na tabela de rotas do build) |
| `/api/exchange/current` · `/api/exchange/health` | **200** · **200** | 0,055 s · 0,046 s |

**Warm-up pós-restart**: `/` 0,022 s · `/products` 0,349 s · `/lojas` 0,128 s · `/search?q=perfume` 0,335 s — o cold start de ~4 s medido na 05.17 **não** reapareceu. ⚠️ **Observação honesta**: `/products` variou de **0,349 s (warm-up)** a **2,225 s** (smoke seguinte) sem mudança de dado — a rota é **dinâmica** (não prerenderizada) e essa variação precisa ser acompanhada antes do cutover; não é regressão desta imagem (mesma faixa da 05.17).

## B.6 Provedor keyless — obtido da produção, **sem gravar no banco**

Executado **dentro do container** (mesmo endpoint e mesmas faixas de sanidade do `KeylessExchangeRateProvider`), apenas leitura externa:

| Fonte | USD→PYG | USD→BRL | Dentro da faixa |
|---|---|---|---|
| `open.er-api.com` (primária) | **5710,951674** | **5,015062** | ✅ |
| `currency-api` (secundária) | **5715,14457105** | **5,02743305** | ✅ |

Divergência entre as fontes: **0,073% (PYG)** e **0,246% (BRL)** — dentro do limite de 2% do provider, ou seja, se a RPC de câmbio fosse chamada agora ela **aceitaria** estes valores e os gravaria. **Nada foi gravado**: `exchange_rates` permanece **0**. *Limitação*: esta verificação exercita a **fonte e as faixas de sanidade** a partir da rede de produção, não a instanciação da classe TS compilada (que exige o caminho de escrita do serviço, proibido nesta fase).

## B.8 Rollback armado e integridade do stack

- Imagens presentes: **`paraguai-web:a2fcec0`** (no ar), `paraguai-web:latest`, **`paraguai-web:previous`** (imagem de 2 h, da 05.16) ⇒ `deploy.sh --rollback` está **pronto** (retag + `up -d`, sem rebuild, com health/smoke gates).
- **Nenhum rollback foi necessário**: todos os critérios passaram.
- Os 9 containers seguem `healthy`; os 8 do Supabase mantêm `Up 7 days` (nenhum reinício); `/opt/paraguai` e os backups intocados.

## B.9 Achados colaterais (registrados, não mascarados)

1. **404 de relação ausente, agora provado**: durante o prerender do build, vários repositórios registram `404 page not found` — o corpo em **texto puro** que a Mission 05.17 não conseguiu atribuir. Verificado: `buyer_events`, `market_changes`, `connectors`, `canonical_products`, `marketplace_alerts` **existem**; **`search_events` está AUSENTE** ⇒ este é o objeto que explica o log `[search-suggestions] buyer_events query …` e confirma o mecanismo (o PostgREST devolve `404 page not found` quando a **relação** não está no schema cache). As demais linhas (`SupabaseConnectorRepository.list`, `SupabaseMarketChangeRepository.listInRange`, `SupabaseCanonicalCatalogRepository.findAll`) consultam outras relações/vistas e **não** foram individualmente confirmadas — não afirmo quais são.
2. `vercel.json` está `{}` (desativação coordenada da Fase 05.19); o workflow GHA **continua intocado**, como planejado.
3. `search_events` ausente é pré-existente (aparece também no build da 05.16) e **não** foi introduzido por esta imagem.

## B.10 GO / NO-GO

**Fase B: CONCLUÍDA COM SUCESSO.** Versão **`a2fcec0`** no ar em loopback, `healthy`, 0 restarts, sem segredos na imagem; 10 de 11 rotas em 200 (o 404 de `/sitemap.xml` é o comportamento canônico do Next); provedor keyless funcional **a partir da produção** com valores dentro da faixa e divergência de 0,07–0,25%; **zero** impacto em PostgreSQL (conexões 3→3, `PGRST003`/`57014` inalterados); rollback armado e stack Supabase intacto.

**GO CONDICIONAL para a Fase C (cutover público)**, com estes pré-requisitos:
1. **Acompanhar `/products`** (variação 0,35 s → 2,2 s) — decidir cache mínimo antes de tráfego real.
2. **Autenticação positiva de cron** continua pendente: exige executar a lógica de escrita de um endpoint (D1 da Fase A), fora da autorização desta fase. Recomendação: teste unitário isolado de `requireCronSecret` (positivo + negativo + timing-safe) para fechar a validação **sem** escrever no banco.
3. Habilitar timer + desligar workflow GHA (D4/D5), depois de D1.
4. `search_events` ausente: decidir se cria a tabela (DDL, fora de escopo) ou se o código tolera (hoje tolera, com log).
5. Caddy + DNS + negação de `/api/cron/*` na borda (D6/D7) — **último passo**.

**NO-GO** para publicar domínios nesta fase: nada de Caddy/DNS foi tocado, conforme a autorização.
