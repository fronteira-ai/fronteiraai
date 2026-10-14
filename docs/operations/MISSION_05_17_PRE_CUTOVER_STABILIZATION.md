# MISSION 05.17 — PRE-CUTOVER STABILIZATION

**Categoria**: `docs/operations/`
**Branch**: `mission-05-17-pre-cutover-stabilization` (de `mission-05-16-controlled-boot` @ `9d3764d`)
**Regras respeitadas**: nada de produção foi alterado — nenhum DDL/DML, migration, deploy, merge, cron, secret, DNS, Caddy ou Docker; container em execução não reiniciado; Mission 04 preservada. Todo diagnóstico foi **read-only** (psql `SELECT`, `curl` GET em loopback/API, leitura de `pg_proc`/`information_schema`).
**Nota de escopo**: as prioridades P0–P2 são **investigação** e P3 é **proposta**; os bloqueios encontrados são de **schema/operação de produção**, que esta missão proíbe alterar. Por isso **nenhuma mudança de comportamento foi aplicada** — ver §2.

---

## 1. CAUSA COMPROVADA DE CADA PROBLEMA

### 1.0 Duas autocorreções de instrumento (declaradas antes das conclusões)

Para que nenhuma conclusão se apoie em medição defeituosa:

| Meu probe inicial | O que o PostgREST respondeu | Verdade verificada |
|---|---|---|
| `exchange_rates?select=rate_date` | `column "rate_date" does not exist` | Coluna real é `captured_at` — **o código do app lê `pair, rate, source, captured_at`, ou seja, NÃO há divergência**. O erro era do meu probe. |
| `rpc/search_products_global?p_search=…` | `404 PGRST202 … "Perhaps you meant to call the function public.search_products_global(p_limit, p_offset, p_term)"` | O parâmetro real é **`p_term`** e o código **já o usa corretamente**. O 404 era do meu probe. |

Consequência: os dois "achados" de divergência de schema da minha primeira passada eram **artefatos de medição minha**, não defeitos do sistema. Registro isso explicitamente porque a Mission 05.17 ordena não presumir divergência de schema sem evidência — e a evidência, quando obtida corretamente, **não** a sustenta.

### 1.1 P0 — `/products` com 4,13 s: **efeito de primeira requisição (cold start)**, não custo de regime

| Medição | Resultado |
|---|---|
| `/products` **1ª vez após o boot** (Mission 05.16) | **4,13 s** |
| `/products` a quente, 3 rodadas consecutivas | TTFB **0,095 / 0,077 / 0,061 s** · total **0,228 / 0,161 / 0,125 s** |
| RPC `search_products_catalog` **direto no PostgREST** (piso real de PostgreSQL+borda, via service role) | **0,584 s** (http 200) |
| A mesma RPC como `anon` | **0,524 s** (http 200) |
| `/products` estática? | **não** — ausente de `.next/prerender-manifest.json` (só 46 rotas são prerenderizadas, `/` entre elas) |

**Repartição de tempo** (P0 pedia PG / PostgREST / rede / render):
- **PostgreSQL + PostgREST**: **≈0,52–0,58 s** (medido direto, sem Next.js no caminho) — este é o custo real da RPC de catálogo.
- **Rede**: desprezível (`x-kong-upstream-latency: 7 ms`, `x-kong-proxy-latency: 2 ms` na mesma classe de requisição).
- **Render Next.js a quente**: TTFB **0,06–0,10 s**, isto é **abaixo do piso da RPC** ⇒ nessas requisições a RPC **não** é executada de novo (a resposta sai de cache de dados/HTTP). O 4,13 s da primeira requisição é **inicialização** (pool de conexões, JIT/warm-up de plano, carregamento de módulos e primeira execução da RPC).
- **Conclusão**: `/products` **não é** uma página lenta em regime. O defeito real é de **primeira impressão**: todo restart deixa o primeiro visitante com ~4 s de TTFB.

### 1.2 P1 — `search_products_global` "3,45 s × limite de 3 s": **não se reproduz no self-hosted e não é bloqueio**

| Medição (read-only, credenciais válidas) | Resultado |
|---|---|
| `rpc/search_products_global?p_term=perfume&p_limit=8&p_offset=0` como **anon** | **http 200 · 1,573 s** (limite do papel `anon` = 3 s) |
| A mesma como **service role** | **http 200 · 1,348 s** |
| Assinatura implantada | `public.search_products_global(p_term text, p_limit integer, p_offset integer)` |
| ACL | `=X/postgres`, `anon=X`, `authenticated=X`, `service_role=X` ⇒ **EXECUTE concedido a todos** |
| Chamada que o app faz (`services/search.service.ts:117-121`) | `{ p_term, p_limit: 8, p_offset: 0 }` ⇒ **casa exatamente** |

**Causa comprovada**: **não há bloqueio**. O número de 3,45 s das Missões 05.8/05.12 foi medido no **banco do cloud**, com outro estado de plano/cache. No self-hosted a RPC responde em **1,35–1,57 s** — **52% do orçamento de 3 s** do papel `anon`: margem suficiente para operar, insuficiente para ignorar (recomendo monitorar; se subir, o caminho é o ADR-060/pg_trgm, **não** aplicar migration agora, conforme a missão).
**Hipótese para o erro de busca da 05.16** (`Não foi possível completar a busca`): a **primeira** chamada da RPC logo após o boot (mesma janela do `/products` de 4,13 s) excedeu os 3 s do `anon` e o app caiu no caminho legado — coerente com a degradação graciosa observada e com todas as medições subsequentes saudáveis. **Hipótese, não fato**: não é possível recronometrar a primeira chamada sem reiniciar o container, o que é proibido nesta missão.

### 1.3 P2 — o "PostgREST 404" das lojas: **não há divergência de schema; não reproduzível**

| Verificação | Resultado |
|---|---|
| `stores?select=*&active=eq.true&order=rating.desc&limit=30` | **http 200**, `server: postgrest/14.12`, `content-range: 0-8/*` (9 lojas ativas), `x-kong-upstream-latency: 7 ms` |
| Variantes (`select=id`, com/sem `active`, sem `order`) | **200, 200, 200** |
| Controle (`offers`, `products`) | 200, 200 |
| `[stores-public] store query` = `getStoresRanking()` (`services/stores-public.service.ts:88-95`), exatamente a consulta acima | **saudável agora** |
| Objetos essenciais (`to_regclass`) | `stores`, `offers`, `products`, `price_history`, `exchange_rates`, `marketplace_alerts`, `merchants`, `merchant_stores`, `brands`, `categories` → **todos presentes** |
| Dados | `stores=11` (**active=9**), `products=52.674`, `offers=52.715`, `exchange_rates=0` |

**Causa**: a mensagem registrada na 05.16 (`404 page not found`, texto puro) **não** tem o formato do PostgREST — toda resposta do PostgREST vem em JSON com `proxy-status: PostgREST; error=…` (comprovado no §1.0). Portanto ela **não** foi produzida pelo PostgREST, e a consulta às lojas está **comprovadamente saudável**. Conclusão honesta: **a causa exata dessa linha de log não foi reproduzida**; a hipótese mais provável é **transiente de primeira requisição/borda** (a mesma janela de cold start de §1.1/§1.2), sem qualquer indício de divergência de schema. **Não** afirmo divergência de schema — a evidência a contradiz.
**Ação de follow-up derivada**: o app registra apenas `error.message`, descartando `code`/`details`/`hint` — o que tornou impossível distinguir PGRST202/PGRST205/57014 de um 404 de borda. Patch proposto em §2.

### 1.4 Câmbio (P4) — causa comprovada: **tabela vazia + rota de atualização sem agendamento** (não é schema)

`exchange_rates` tem as colunas `id, pair, rate, source, captured_at` (**idênticas** ao que o código lê) e **0 linhas**. A rota `app/api/cron/exchange/refresh/route.ts` **existe** mas **não está em `vercel.json`** — que agenda apenas 3 crons: `/api/cron/connectors/sync` (06:00), `/api/cron/marketplace-operations/snapshot` (07:00) e `/api/cron/canonical-catalog/outbox-maintenance` (03:00). Somado à ausência de `EXCHANGE_RATE_API_KEY` (05.4), o câmbio fica em fallback. **Duas causas independentes, ambas operacionais.**

### 1.5 Bookkeeping de migrations — não verificável mecanicamente (limitação declarada)

`supabase_migrations.schema_migrations` **não existe** neste banco; só há `auth.schema_migrations` (tabela do GoTrue). Não é possível, portanto, **ler** o conjunto de migrations aplicadas por versionamento. Evidência indireta positiva: as assinaturas das funções implantadas casam com as do repositório (`20260809120000`/`20260827000000`/`20260916120000`). As 32 migrations locais de `supabase/migrations` (mais 21 em `database/migrations`) não podem ser confrontadas uma a uma **sem** DDL — limitação declarada.

---

## 2. CORREÇÕES IMPLEMENTADAS NA BRANCH

**Nenhuma mudança de comportamento.** Justificativa técnica: os bloqueios identificados **não** são defeitos de código — são (a) efeito de cold start, (b) falsos positivos do meu instrumento, (c) dados/agendamento de produção. Todas as correções cabíveis exigem DDL, cron, secret ou deploy — **proibidos** nesta missão.

O que a branch entrega é o **patch de observabilidade** (única correção de código legítima e de risco zero), **aplicado nesta branch** e conferido por lint/typecheck/testes (§3):

```diff
// services/stores-public.service.ts:95
-  if (storeError) console.error("[stores-public] store query:", storeError.message);
+  if (storeError) {
+    console.error("[stores-public] store query falhou:", {
+      message: storeError.message,
+      code: storeError.code,        // PGRST202/PGRST205/57014 — distingue a causa
+      details: storeError.details,
+      hint: storeError.hint,
+    });
+  }

// services/search.service.ts:158
-    console.error("search_products_global (RPC não disponível?):", rpcError.message);
+    console.error("search_products_global (RPC não disponível?):", {
+      message: rpcError.message,
+      code: rpcError.code,
+      details: rpcError.details,
+      hint: rpcError.hint,
+    });
```

Sem esse patch, o próximo incidente de 404/timeout no self-hosted volta a ser **indistinguível** — foi exatamente a lacuna que travou o P2.

---

## 3. TESTES E MEDIÇÕES

| # | Medição | Comando (read-only) | Resultado |
|---|---|---|---|
| M1 | `/products` a quente ×3 | `curl -w '%{time_starttransfer}' http://127.0.0.1:3100/products` | TTFB 0,095/0,077/0,061 s |
| M2 | Piso PG+PostgREST da RPC de catálogo | `curl .../rpc/search_products_catalog?p_limit=12&p_offset=0` | 0,584 s (srv) / 0,524 s (anon) |
| M3 | Busca global correta | `curl .../rpc/search_products_global?p_term=perfume&p_limit=8&p_offset=0` | 200 · **1,573 s** (anon) / **1,348 s** (srv) |
| M4 | Busca global com parâmetro errado | `...?p_search=…` | 404 `PGRST202` + hint do nome correto |
| M5 | Consulta de lojas + variantes | `.../stores?select=*&active=eq.true&order=rating.desc` | 200, `postgrest/14.12`, 9 linhas |
| M6 | Assinaturas e ACL das funções | `pg_proc` + `pg_get_function_identity_arguments` | `p_term`; EXECUTE para `anon`/`authenticated`/`service_role` |
| M7 | Objetos essenciais | `to_regclass` ×10 | 10/10 presentes |
| M8 | Dados | `count(*)` | stores 11 (active 9) · products 52.674 · offers 52.715 · **exchange_rates 0** |
| M9 | Colunas vs código | `information_schema.columns` | `exchange_rates` **compatível** com o código |
| M10 | Crons agendados | `vercel.json` | 3 de 7 rotas de cron agendadas |
| M11 | Frontend em produção (05.16) | `docker inspect`/`stats` | healthy, 0 restarts, 86,9 MiB/1 GiB |

Gates locais **executados nesta branch depois do patch do §2**, no mesmo commit: lint 0 erros (1 warning pré-existente), `tsc --noEmit` limpo, **187/187** suítes, **1409/1409** testes, build exit 0. O patch altera apenas o conteúdo de `console.error`; antes de aplicá-lo confirmei que **nenhum teste** assegura esses argumentos (só há `run().catch(console.error)` e um comentário, em áreas não relacionadas).

---

## 4. POLÍTICA DE CACHE RECOMENDADA (proposta; **não** aplicada)

Princípio: cachear **conteúdo editorial**, nunca **preço/câmbio**; e invalidar por **evento**, nunca por TTL arbitrário. **Sem TTL de 300 s** em produtos, preços ou câmbio (proibido nesta missão e tecnicamente incorreto para preços).

| Superfície | Estratégia | Invalidação | Por quê |
|---|---|---|---|
| `/` (home) | ISR **60 s** (já é o estado atual: `app/page.tsx:39`) | `revalidateTag("home")` após sync | conteúdo editorial + destaques; 60 s é o menor intervalo já em produção |
| `/products`, `/lojas` | ISR **120–300 s** *somente* se o dado for de listagem | `revalidateTag("catalog")` no fim de `connectors/sync` | reduz a RPC de catálogo (0,52–0,58 s) à fração de invocações |
| `/product/[slug]` | ISR **300 s na casca** (nome, marca, imagens, descrição) | `revalidateTag("product:<id>")` no sync | casca é estável; o preço **não** entra aqui |
| **Preços/ofertas** | **sempre dinâmico** (`fetchCache = "force-no-store"` na leitura de `offers`/`price_history`) | — | preço velho é o pior defeito possível num comparador |
| **Câmbio** (`/api/exchange/*`) | **dinâmico** + cache em memória com TTL curto (já existe `ExchangeRateCache`) | **evento** `exchange_rates` novo | o app converte preço exibido; não pode ficar preso |
| `/search` | **dinâmico** + `noindex` | — | consulta do usuário |
| `robots.txt`, `sitemap*.xml` | estático | build | não muda entre deploys |
| `/api/cron/*` | dinâmico, nunca cacheado | — | trabalho de escrita |

**Ganho esperado**: `/products` deixa de invocar a RPC a cada visita (hoje 0,52–0,58 s de CPU de banco por requisição) sem nunca servir preço velho — a separação "casca cacheada / preço dinâmico" é o ponto central.
**Pré-requisito de segurança**: só aplicar depois de existir **warm-up pós-deploy** (ver §5, D2), porque cachear a casca **não** resolve o cold start se a primeira requisição continuar batendo no banco frio.

---

## 5. DEPENDÊNCIAS PARA PUBLICAÇÃO

| # | Dependência | Evidência | Bloqueia cutover? |
|---|---|---|---|
| **D1** | **Cold start**: primeira requisição pós-restart ~4 s (1ª visita lenta) | §1.1 (4,13 s vs 0,06 s a quente) | **Sim, como experiência** — mitigar com warm-up pós-deploy + `restart: unless-stopped` já configurado |
| **D2** | **Warm-up pós-deploy** (`curl` nas rotas-chave após subir) | decorre de D1 | Sim (barato) |
| **D3** | **`CRON_SECRET`** ausente no host e não criado na 05.16 | `grep -c '^CRON_SECRET=' app.env` → 0 | Não para leitura; **sim** para agendamento self-hosted |
| **D4** | **Agendamento dos crons**: 7 rotas existem, 3 estão em `vercel.json`; no VPS **nenhuma** | §1.4, M10 | Sim, para manter dados frescos sem a Vercel |
| **D5** | **`EXCHANGE_RATE_API_KEY`** ausente em todo lugar + `exchange_rates` vazia | §1.4, M8 | Não para páginas; sim para câmbio |
| **D6** | **Bookkeeping de migrations** inexistente (`supabase_migrations`) | §1.5 | Não, mas impede auditoria mecânica |
| **D7** | **Caminho de deploy** (hoje `git archive` + `scp` manual, sem CI) | 05.16 §D2 | Sim para operação repetível |
| **D8** | **Política de frescor/cache** (§4) precisa de aprovação de produto/SEO | — | Sim (evita regressão de conteúdo) |
| **D9** | **Exposição pública** (Caddy + DNS) — decisão de infraestrutura | 05.15/05.16 | É o próprio cutover |
| **D10** | **Monitoramento de recursos**: sem Observability na Vercel; no VPS há 5 timers systemd + healthchecks Docker, mas **Kong sem rotação de log (4,3 GB)** e nenhum alerta para CPU/erros do frontend | 05.13/05.16 | Não bloqueia; recomendado antes de tráfego real |

**Observação de risco central para o cutover**: o frontend e o PostgreSQL dividem **4 vCPU**. Cada `/products` sem cache custa ~0,52–0,58 s de CPU de banco; é exatamente a contenção que motivou a Mission 05 (§4 é a mitigação).

---

## 6. GO / NO-GO PARA CUTOVER

**GO — diagnóstico aprovado.** Os três "bloqueios" da 05.16 foram resolvidos por medição: P0 é **cold start**, não lentidão de regime; P1 **não se reproduz** no self-hosted (1,35–1,57 s, abaixo do limite de 3 s); P2 **não tem causa de schema** — a consulta de lojas responde 200 e os 10 objetos essenciais existem. Duas das minhas hipóteses iniciais foram **refutadas pelos próprios dados** (§1.0) e estão registradas como tal.

**GO CONDICIONAL para o cutover** — exige, no mínimo: **D1+D2** (warm-up pós-deploy), **D7** (deploy repetível), **D8** (política de cache aprovada), **D4/D3** (agendamento + `CRON_SECRET`, se os crons passarem a rodar no VPS) e **D9** (aprovação explícita de DNS/Caddy). Sem D1+D2+D8, publicar significa entregar ~4 s de TTFB na primeira visita de cada restart e manter toda visita de catálogo custando ~0,55 s de banco.

**NO-GO nesta missão** para: alterar produção (container em execução, banco, Docker, DNS, Caddy, secrets, crons), aplicar migrations (incluindo as de 05.7/ADR-060), aplicar TTL de 300 s em produtos/preços/câmbio, ou fazer deploy/merge. **Nada foi alterado fora da branch.**
