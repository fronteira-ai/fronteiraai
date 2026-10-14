# MISSION 05.12 — VERCEL CPU & CACHE AUDIT · PRODUCTION RECOVERY

**Categoria**: `docs/operations/`
**Branch**: `mission-05-12-vercel-cpu-audit` (a partir de `origin/main` = `c43538b`)
**Produção**: **read-only** — nenhum deploy/redeploy, nenhuma alteração de Vercel/DNS/secrets, nenhum DDL/DML, nenhum cron manual, nenhum restart, nenhuma carga sintética. Mission 04 preservada (byte-idêntica); branches anteriores não modificadas.
**Escopo**: diagnóstico + correções preparadas + plano de recuperação. Nada publicado, nada aplicado.

---

## ROOT_CAUSE

**Causa formal da suspensão: Fluid Active CPU 11h29 contra limite de 4h** (Hobby). Os demais excessos
(Provisioned Memory 383,1/360 GB-h · Fast Origin Transfer 14,72/10 GB · ISR Writes 183.827/200.000)
são sintomas do mesmo padrão, não causas independentes.

**O que foi descartado com evidência (não presumido)**:

| Hipótese | Veredito | Evidência |
|---|---|---|
| Middleware caro em todo request | **DESCARTADA** | `proxy.ts` tem `matcher: ["/admin/:path*", "/merchant/:path*", "/auth/callback"]` — **tráfego público não executa middleware** |
| Cache/CDN ausente por configuração do projeto | **DESCARTADA** | a CDN entrega 768.113 requests; o problema é a **fatia que invoca função** (ver abaixo) |
| Mission 05.6 (offers-first) como causa | **DESCARTADA como causa** | o commit foi mergeado em `main` mas **nenhum deployment foi criado** — não executou em produção |
| Supabase como causa | **DESCARTADA como causa primária** | a API self-hosted está saudável; o banco é **vítima** do padrão de acesso e **fonte do tempo de espera** que aparece como Provisioned Memory |

**Hipóteses ordenadas por evidência (a decomposição exata por rota está BLOQUEADA — ver limitação)**:

**H1 (forte) — o site é dinâmico em quase todo o tráfego público.** `invocations / CDN requests =
573.878 / 768.113 = **75%**`: três de cada quatro requests entregues pela CDN **executam função**. As
rotas de consumidor são dinâmicas por declaração:
`app/product/[slug]` (ƒ dinâmica), `app/products` (ƒ), `app/search` (ƒ), `app/lojas/page.tsx`
(`export const dynamic = "force-dynamic"`), `app/sitemap.ts` (`force-dynamic`). Só `app/page.tsx`
(home) é ISR com `revalidate = 60`. Cada render de produto executa **5–8 leituras** no Supabase
(medidas em missões anteriores: `products`+`offers`, `price_history` (embed caro), `market_changes`
(limite 500), `canonical_products`, `marketplace_memory_facts`, `exchange_rates`, `products`
relacionados com `limit=120`) → CPU + memória provisionada + origin transfer em cada invocação.

**H2 (forte) — CPU média por invocação ≈ 72 ms, ~3× acima do orçamento.** Derivado da tabela do
proprietário: `11h29 = 41.340 s ÷ 573.878 invocações = **72 ms de CPU ativa por invocação**`. Para
caber em 4h (14.400 s) com o **mesmo volume**, a média teria de cair para **≤25 ms** ⇒ **redução de
~3×** (ou ~3× menos invocações, ou uma combinação). Isso é aritmética de orçamento, não atribuição
de CPU por rota.

**H3 (média) — transferência de origem por invocação ≈ 26 KB.** `14,72 GB ÷ 573.878 = **26 KB**` de
origem por chamada — coerente com payloads medidos: `/products` devolve **568 KB** de HTML,
`sitemap` de produto **428 KB** por chunk (3 chunks = **6.000 URLs de produto**), e páginas de
produto que carregam `market_changes` com até 500 linhas e listas de relacionados com `limit=120`
(**107 KB** medidos na Mission 05).

**H4 (média) — 32% das invocações produzem ISR write.** `183.827 ÷ 573.878 = **32%**`, com
**91,9%** do teto de ISR writes consumido. Pela configuração atual, só a home (`revalidate = 60`)
escreve ISR de página; 30 dias × 1.440 = **43.200 regenerações no máximo** ⇒ **~140 mil writes não
explicadas** por essa única rota. Hipótese (não comprovável sem a observabilidade bloqueada): cada
regeneração grava **várias entradas de data cache** (e os chunks de sitemap com
`generateStaticParams` também gravam) — ou seja, o número de *escritas* supera o de *regenerações*.
**Não invento a decomposição.**

**H5 (média) — tráfego automatizado real e repetido.** Medido ao longo das missões 05–05.09:
**441 páginas de produto distintas em ~4 minutos** num único pico de crawler (Mission 05);
**6.000 URLs** de produto publicadas para buscadores em sitemaps de 428 KB; bursts diários às
07:54 (cron) e picos de crawl distribuídos; **1.052 respostas 5xx** e timeouts crônicos no log do
Kong. Crawlers seguem paginação e sitemaps — e cada URL de produto é uma invocação dinâmica.

**H6 (baixa/média) — endpoints públicos acessíveis a bots.** `/api/analytics/events` (POST público),
`/api/analytics/session`, `/api/compare`, `/api/exchange/*`, `/api/trust/*` são alcançáveis por
varredura; cada chamada é invocação + trabalho de banco. Não medi a participação de bots nesses
endpoints (sem logs de runtime na Vercel) — fica como lacuna declarada.

---

## TOP_CPU_CONSUMERS

## **NÃO DISPONÍVEL — limitação da plataforma, declarada e não substituída por suposição.**

Tentativas read-only, com o erro literal da plataforma:

```
$ npx vercel usage --from 2026-09-14 --to 2026-10-14 --breakdown daily
  Error: Costs not found (404)                       <-- Hobby não expõe dados de custo via API

$ npx vercel metrics vercel.function_invocation.function_cpu_time_ms \
      --since 2026-09-14 --until 2026-10-14 --group-by route -a sum --prod
  Error: Observability Plus is required to run this query for team fronteiraai
  and is available on Pro and Enterprise plans.
```

O catálogo de métricas **existe** e contém exatamente o que a missão pede
(`vercel.function_invocation.function_cpu_time_ms`, `...function_duration_ms`,
`...provisioned_memory_mb`, `...ttfb_ms`, `...count`, `vercel.isr_operation.write_units`,
`vercel.middleware_invocation.*`, `vercel.request.route_cpu_duration_ms`, com dimensões
`route`, `request_path`, `path_type`, `http_status`, `function_start_type`), mas **a consulta é
bloqueada no plano Hobby**. Portanto: **sem números por rota**.

**Ranking por PROXY (evidência própria, claramente rotulado como proxy — não é CPU da Vercel)**

| Ordem | Rota / mecanismo | Base da evidência (medida) |
|---|---|---|
| 1 | `/products` (`search_products_catalog`) | RPC **~505 ms** de agregação por chamada + **2ª chamada completa** quando a página vem vazia; 21 ocorrências de erro no PostgREST desde 10/Out; é a entrada do crawl paginado |
| 2 | `/search` (`search_products_global`) | **3.451 ms medidos** (> timeout de 3 s do `anon`), `Seq Scan` de 52.674 produtos com duas operações de string por linha (2.994 ms só no filtro) |
| 3 | `/product/[slug]` | **5–8 leituras** por render, todas sem cache entre requisições; os dois embeds de `price_history` mediam **574–698 ms** (produto) e **637–678 ms** (canonical) **por chamada** — corrigidos no 05.6 (mergeado, **não implantado**) |
| 4 | `sitemap` de produto (`generateSitemaps`) | **3 chunks × 428 KB** = 6.000 URLs; `app/sitemap.ts` está `force-dynamic` (sem cache) e é refetchado por buscadores |
| 5 | `/lojas` | `force-dynamic` — SSR + consultas a cada request |
| 6 | `/api/analytics/*` e demais endpoints públicos | invocação + escrita por chamada, alcançáveis por bot (participação não medida) |

---

## TRAFFIC_ANALYSIS

| Evidência | Valor | Fonte |
|---|---|---|
| CDN requests / invocações de função | 768.113 / 573.878 ⇒ **75% invocam função** | tabela do proprietário (§1) |
| Pico de crawler medido | **441 páginas de produto distintas em ~4 min**; 421 ids únicos | access log do Kong (Mission 05) |
| URLs de produto publicadas | **6.000** (3 chunks de 2.000) | `product/sitemap/{0,1,2}.xml` = 428 KB cada |
| Volume de leitura por página de produto | **7.399 requests a `price_history`** num tail curto, `offers` 1.054, `products` 479, `market_changes` 438 | Kong (Mission 05) |
| Tráfego cessante na queda | 117 requests na hora 12/Out 22:00 → **1–3/hora** depois (só crons) | Kong (Mission 05.11) |
| Erros crônicos no período | **1.052 5xx** no Kong (87% em `/offers`), `57014` 462→1.169, `PGRST003` 55→67 | logs do PostgREST/Kong |

**Limitações de observabilidade (declaradas, não contornadas)**:
1. **Sem CPU por função/rota** (Observability Plus é Pro/Enterprise) — o ranking acima é proxy.
2. **Sem dados de custo via API** (`vercel usage` → 404 no Hobby).
3. **Sem logs de runtime da Vercel**: `vercel logs` tem retenção curta e o último deployment de
   produção está **desabilitado** (5 dias) — não há runtime para consultar.
4. **Identidade de crawler não é atribuível** pelo que tenho: o Kong vê apenas o IP do Caddy e o
   `User-Agent` do SSR (`node`); a Vercel não está acessível. Portanto **não afirmo "foi o
   Googlebot"** — afirmo a **forma** do tráfego (centenas de páginas de produto distintas por
   minuto, repetidamente), que é comportamento de crawler/coletor, sem atribuir identidade
   (exatamente como pede a missão: IP/UA isolados não são prova).

---

## CACHE_AUDIT

| # | Achado | Evidência | Impacto em CPU |
|---|---|---|---|
| C1 | **Quase todo o tráfego público é dinâmico** — 75% dos requests invocam função; `/product/[slug]`, `/products`, `/search` dinâmicos; `/lojas` e `app/sitemap.ts` `force-dynamic` | código + build + tabela de uso | **alto** |
| C2 | **Só a home tem ISR** (`app/page.tsx`: `export const revalidate = 60`) | código | — (é o único alívio hoje) |
| C3 | **Sitemaps sem cache** (`app/sitemap.ts` `force-dynamic`; chunks de produto em SSG) refetchados por buscadores | código + 3×428 KB | médio |
| C4 | **Cache de dados é apenas por requisição** (`cache()` do React em `_cache.ts`; nenhum `unstable_cache` no projeto) ⇒ um crawl de N páginas repete todas as leituras N vezes | `app/product/[slug]/_cache.ts`, `lib/home-premium-service.ts:279` | **alto** sob crawl |
| C5 | **ISR writes em 91,9% do teto** (183.827) sem rota que justifique o volume ⇒ hipótese de múltiplas gravações de cache por regeneração (H4) | tabela + código | médio (custo/quota) |
| C6 | **Payloads grandes na origem** (~26 KB por invocação; `/products` 568 KB; relacionados `limit=120` = 107 KB; `market_changes` até 500 linhas) | medido | médio-alto (origin transfer + memória) |
| C7 | **Duas agregações completas por página vazia** em `/products` (2ª chamada só para `total_count`) | `product.service.ts:417-423` + `EXPLAIN` medido | médio |
| C8 | **Endpoints públicos sem barreira de bot** (`/api/analytics/events` e afins) | código | baixo-médio, não medido |
| C9 | Middleware **não** afeta tráfego público (`matcher` restrito) | `proxy.ts` | nenhum (descartado) |

---

## FIXES_PREPARED

**Nenhum código foi alterado nesta missão.** Motivo, item a item — todas as correções de maior valor
esbarram hoje em uma das três condições abaixo, e implementar sem resolvê-las violaria os guardrails
(freshness de preço/câmbio, SEO, Mission 04):

| # | Correção proposta | Ganho esperado | Bloqueio para implementar agora |
|---|---|---|---|
| **P1** | **Política de frescor + ISR nas rotas de consumidor** (`/products` e `/search` com `revalidate` curto; `/lojas` sai de `force-dynamic`) | o maior de todos: é o que derruba invocações (75% → meta <40%) e Provisioned Memory | exige **decisão de produto sobre frescor** (a missão proíbe TTL arbitrário para preço/câmbio); precisa de contrato explícito do que pode ser servido com N s de atraso |
| **P2** | **Cache dos sitemaps** (`app/sitemap.ts`: remover `force-dynamic`, aplicar `revalidate` longo) + reduzir chunk/URLs se necessário | remove trabalho de DB repetido por fetch de buscador | **`app/sitemap.ts` é um arquivo da Mission 04 com alterações não commitadas** → tocar nele misturaria trabalho de outra missão (proibido). Depende de a Mission 04 ser resolvida antes |
| **P3** | **Reduzir payload por render**: `market_changes` limit 500→50, relacionados 120→24, e não buscar em render o que não é exibido | corta Origin Transfer (14,72 GB → meta <10 GB) e memória | baixo risco, mas exige validação visual de 4 componentes (produto, loja, home, canonical) |
| **P4** | **Cross-request cache** para leituras públicas que não são preço/câmbio (ex.: fatos de memória, canonical slug, relacionados) com invalidação no sync | reduz invocações de DB por crawl | exige política de invalidação (mesma classe de P1) |
| **P5** | **Orçamento de crawl**: `noindex` em paginação/filtros profundos (`?page>N`, filtros combinados), canonical já existente, e `robots.txt` coerente com os 6.000 URLs de sitemap | reduz invocações de crawler sem prejudicar SEO de páginas canônicas | **exige análise e aprovação de SEO** (a missão proíbe prejudicar SEO sem aprovação) |
| **P6** | **Barreira de bot nos endpoints públicos de escrita** (`/api/analytics/*`): rejeitar requisições sem sessão/assinatura válida, com rate-limit já existente como base | remove invocações de bot | exige cuidado para não quebrar telemetria legítima |

---

## EXPECTED_SAVINGS

**Medido (nesta missão ou nas anteriores)** — o que a intervenção **já provada** entrega:
- 05.6 (mergeado, **não implantado**): `price_history` por produto **574–698 ms → ~0,8 ms**;
  canonical **637–678 ms → ~1,4 ms**; por consulta, ~1000×.
- 05.7 (preparado, **não aplicado**): RPC de catálogo **195,98 → 76,4 ms** (−61%) e buffers −58% nos
  filtrados.

**Estimado (não medido — rotulado como estimativa)**:
- CPU ativa por invocação precisa cair de **72 ms → ≤25 ms** (ver H2) para o Hobby caber no mesmo
  volume ⇒ **~3× de redução**. Como o tempo de espera de banco consome *Provisioned Memory* e não
  *Active CPU*, **não é correto** esperar que 05.6/05.7 (otimizações de SQL) reduzam a CPU ativa na
  mesma proporção. O que reduz CPU ativa é **menos invocações** (P1/P3/P5) e **menos trabalho JS por
  render** (P3/P6). Sem os dados por rota, **não quantifico P1–P6 com precisão** — a estimativa de
  ordem de grandeza só é possível depois de recuperar a observabilidade (Pro) ou de instrumentar
  medição própria.
- **Alvo numérico explícito**: para caber em 4h com o volume atual, é preciso cortar **≥68% da CPU
  ativa** (41.340 s → ≤14.400 s) **ou** reduzir o volume na mesma ordem, **ou** elevar o teto
  (Pro).

---

## HOSTING_DECISION

| Alternativa | Situação | Veredito |
|---|---|---|
| **A. Hobby após otimizações** | 4h de CPU/mês e 360 GB-h de memória já foram excedidos com 573.878 invocações e 75% de caminho dinâmico. As otimizações P1–P6 **não foram medidas** (observabilidade bloqueada) e as maiores (P1/P5) dependem de decisão de produto/SEO | **NÃO PROVADO que basta.** Declarar "Hobby é suficiente" seria exatamente o que a missão proíbe. É plausível **só** com P1+P3+P5 implantados e medidos; sem medição, é risco de nova suspensão |
| **B. Vercel Pro** | Remove a suspensão imediata (CPU 100h+, memória 1.000 GB-h, FOT 1 TB, 1M invocações) **e libera Observability Plus** — que é o que permite atribuir CPU por rota e medir as otimizações | **Caminho de menor risco para restaurar o serviço**, com custo recorrente a confirmar pelo proprietário. Recomendado como **ponte** enquanto P1–P5 são medidas |
| **C. Hospedagem alternativa** (Node/Next.js em VPS/container — o ParaguAI já opera VPS + Caddy + Supabase self-hosted) | Elimina o modelo de cobrança por CPU ativa; exige Docker/Node no host, TLS já resolvido pelo Caddy, e migração de cron/sitemap/ISR (ISR em self-hosted exige disco compartilhado ou cache próprio) | **Viável tecnicamente**, esforço operacional **médio-alto** (build/deploy, ISR, observabilidade, rollout) e risco de indisponibilidade durante a migração. Boa opção de médio prazo (consolida a infra no VPS que já existe), ruim como resposta imediata a um site fora do ar |

---

## TEST_RESULTS

- **Nenhuma linha de código foi alterada** nesta missão (só este documento) ⇒ os gates são os do
  conteúdo de `origin/main` (`c43538b`), verificados nas Missões 05.10/05.11 **exatamente nesta
  revisão**: **ESLint 0 erros** (1 warning pré-existente em `scripts/comparison-forensics-audit.ts:19`),
  **`tsc --noEmit` PASS**, **187/187 suítes · 1409/1409 testes**, **`next build` exit code 0**
  (150/150 páginas).
- Nenhum teste foi alterado para esconder falha. Nenhum teste de carga foi executado contra produção.
- Verificação de cache/renderização: feita por **leitura de código** (diretivas `dynamic`/`revalidate`,
  `matcher` do middleware, uso de `cache()` e ausência de `unstable_cache`), não por medição em
  runtime — porque a produção está suspensa.

---

## RELEASE_PLAN

**Fase 0 — recuperar o serviço (somente o proprietário; eu não tenho autoridade)**
1. Resolver o estado da conta/projeto na Vercel (faturamento/uso) **ou** decidir a alternativa B/C.
2. Verificar que o Vercel buildou `main` (`c43538b`, que contém a 05.6) ou disparar redeploy.
3. Assim que o site voltar, eu executo a validação que ficou bloqueada na 05.11: deployment `Ready`
   + alias, smoke tests (`/`, `/products`, `/search`, `/product/[slug]` com e sem oferta pública,
   `/lojas/<slug>`), confirmação no log do Kong de que `price_history` deixou de trazer
   `offers!inner` (05.6 ativa) e re-ancoragem dos contadores `57014`/`PGRST003` com tráfego real.

**Fase 1 — parar o sangramento de CPU (uma por vez, com medição)**
4. **P2** (sitemap sem cache) — depende de resolver a Mission 04 primeiro; ganho pequeno, risco nulo.
5. **P3** (payload por render) — risco baixo, ganho em FOT + memória; validação visual em 4 telas.
6. **P5** (orçamento de crawl) — só com aprovação de SEO; é o maior redutor de **invocações**.
7. **P1** (frescor + ISR nas rotas de consumo) — o maior ganho; só com política de frescor aprovada.
8. **P6** (barreira de bot) — depois de P5, para não bloquear telemetria legítima.
9. **05.7** (migration do pushdown) — depois que o serviço estiver estável e com a 05.6 já medida.

**Fase 2 — medir e decidir**: com Observability Plus (Pro) ativo, obter CPU por rota e **provar** se
P1–P5 bastam para o Hobby. Sem essa medição, permanecer em Pro (ou consolidar no VPS).

---

## GO_NO_GO

- **GO** para: o diagnóstico acima, o plano de recuperação e a preparação de P1–P6 (nada aplicado).
- **NO-GO** para declarar que **o Hobby é suficiente após otimizações** — falta medição (observabilidade
  bloqueada no Hobby) e as duas alavancas maiores (P1/P5) dependem de decisões de produto/SEO.
- **NO-GO** para implantar qualquer otimização antes de o serviço voltar: hoje a produção está
  **suspensa** e não há como medir antes/depois.
- Ação imediata recomendada: **restaurar o serviço** (B — Pro como ponte, ou C — consolidar no VPS),
  e só então executar a Fase 1 com medição.

---

## APPROVALS_REQUIRED

1. **Restaurar o serviço**: resolver o estado na Vercel **ou** autorizar a alternativa (B ou C).
2. **Plano de hospedagem**: decidir entre Hobby+otimizações (com medição), Pro (custo) ou VPS (esforço).
3. **Política de frescor** para as rotas de consumo (P1/P4) — sem ela não há cache entre requisições.
4. **Política de SEO/crawl** (P5) — qualquer `noindex`/robots exige sua aprovação explícita.
5. **Mission 04**: decidir o destino das alterações não commitadas (`app/sitemap.ts` entre elas) —
   enquanto isso, P2 fica bloqueado.
6. **Aplicar a 05.7** e demais migrations de performance — na janela definida na Fase 1.
