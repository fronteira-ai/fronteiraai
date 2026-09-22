# Merchant Console / Public Catalog Production Validation

> **Nota de governança**: a missão original pediu este arquivo em `docs/production/`.
> `docs/production` **não é** uma das 11 categorias oficiais do Knowledge System
> (criar categoria exige aprovação do CTO + ADR). Trade-off declarado: mantido em
> `docs/operations/` (categoria existente para status/registros de operação e
> validação). Mover para `docs/production/` somente após ADR que crie a categoria.
>
> **Proveniência das evidências**: os itens deste documento estão marcados quando
> relevantes como **[executado neste repositório]** (reproduzível por
> `git`/`npm`), **[owner-executed]** (executado pelo owner contra produção — SQL
> read-only, HTTP, Vercel CLI, harness E2E) ou **[código]** (verificado no diff/
> estado do repositório). Nada aqui é inferência apresentada como medição.

**Alvo**: produção `https://www.fronteiraai.com` + self-hosted `https://api.fronteiraai.com`
(VPS `94.103.168.244`, hostname `fluence`, container `supabase-db`).

---

## Scope

Duas frentes independentes, validadas contra produção:

1. **Merchant Console** — autorização/checksum do fluxo de mutação de catálogo
   (`PREVIEW → APPROVAL → COMMIT → LIVE OFFER → SYNC → AUDIT`) e o ciclo E2E
   autenticado de dois tenants QA isolados.
2. **Public Catalog Visibility (P2)** — incidente de **visibilidade de consumidor**:
   loja/oferta com `stores.active = false` reaparecendo em superfícies públicas.

**Não é** e não deve ser classificado como *authentication bypass*: RLS, Auth,
RBAC, membership, cross-tenant e merchant authorization não foram tocados em nenhuma
das duas frentes. É um problema de **visibilidade pública de catálogo** (exposição de
dados de qualidade/dados QA).

## Security invariants

Invariantes preservadas em todo o ciclo (nenhuma alterada por P1, checksum, P2 ou hotfix):

- `authenticated user → valid merchant → merchant↔store membership → ACTIVE merchant
  authorization → role permits mutation → commit` (fail-closed: erro de query **nunca**
  vira autorização).
- RLS: anon não lê `merchants`/`merchant_stores`/`merchant_authorizations`/
  `merchant_import_sessions`/`merchant_audit_logs`.
- Cross-tenant: merchant A nunca lê/escreve recurso de B (API e páginas).
- **Visibilidade de consumidor ≠ autorização**: merchant/admin/internal continuam
  podendo operar lojas/ofertas inativas quando autorizados. O contrato P2 é aplicado
  exclusivamente nos caminhos públicos.
- `stores.is_verified` **não** participa da regra de visibilidade pública.

## Public catalog contract

```
PUBLIC STORE   = stores.active = true
PUBLIC OFFER   = offers.available = true AND stores.active = true
PUBLIC PRODUCT = possui pelo menos uma PUBLIC OFFER
```

A elegibilidade é resolvida **antes** de: preço, estoque, ranking, contagem,
`total_count` e paginação — nunca por remoção posterior de linhas já agregadas
(com a exceção nomeada de gates JavaScript de *linha*, que existem apenas como
defesa em profundidade e não como fonte de contagem/paginação).

## Production environment

- App: Next.js 16.2.9 / React 19 / TypeScript / Tailwind v4, deploy Vercel.
- Dados: Supabase **self-hosted** / PostgreSQL (VPS `94.103.168.244`). O Supabase
  Cloud legado **não** é usado.
- Deploy do fechamento do P2: `dpl_9Uarx7NpepsjsSzrozMqBgcsNbnq` · alias
  `https://www.fronteiraai.com` · commit em produção `500f1f0` **[owner-executed]**.

## Relevant commits

| Commit | Papel | Conteúdo | Evidência |
|---|---|---|---|
| `7210ec7` | P1 authorization gap | `imports/commit` e `imports/run` passam a exigir `merchant_stores` membership **+** `merchant_authorizations` **ACTIVE** (par exato `merchant_id × store_id`) + role `manage_imports`, fail-closed | 8 cenários de autorização + 5 fail-closed (`services/__tests__/merchant-console-security.test.ts`) **[código]** |
| `9f740a8` | Checksum contract | 1ª camada route `isRawSourceUnchanged()` → **409**; 2ª camada `CommitContext.offersChecksum = normalizedOffersChecksum(offers)` (de `sourceChecksum`, eliminando ambiguidade raw×normalizado) | 4 regressões, incluindo a que reproduz o bug **[código]** |
| `a65ae43` | Commit counters (reporting) | `writeItem()` deixou de incrementar `createdOffers` incondicionalmente (`if (!prev) created … else if (wasUnchanged) unchanged … else updated …`) | 4 testes de regressão; idempotência real do upsert inalterada **[código]** |
| `dd5b6d2` (2026-09-19) | **P2 — correção principal** | Contrato de catálogo público propagado por `stores-public`, `store`, `offer`, `product`, `search`, `home premium`, `compare`, `canonical catalog`, `buyer intelligence`, `market intelligence`, `price intelligence`; catálogo público com elegibilidade/contagem/paginação no SQL; +`services/__tests__/public-catalog-visibility.test.ts` (20 arquivos, 1751+/199−) | `git show --stat dd5b6d2` **[executado neste repositório]** |
| `500f1f0` (2026-09-21) | **P2 — hotfix do /search** | (1) RPC bem-sucedida com `[]` ⇒ `return []` (sem fallback); (2) enrichment `stores(active)` → `stores!inner(active)`; (3) fallback `stores(active)` → `stores!inner(active)`; teste que codificava o bug substituído + teste de contrato do embed | `git show 500f1f0` **[executado neste repositório]** |

## Database migration

`supabase/migrations/20260916120000_public_catalog_visibility.sql` — **nova, forward-only**
(210 linhas), aplicada **manualmente** no PostgreSQL self-hosted de produção
**[owner-executed]**. **Não reaplicar.**

Altera duas RPCs vivas:

- `public.search_products_catalog` — passa a ser o **único** caminho de
  elegibilidade + agregação + `count(*) OVER ()` + `LIMIT/OFFSET` de `/products`,
  para todos os sorts (`price_asc`, `price_desc`, `newest`, `relevance`,
  `best_selling`, `top_rated`, `NULL`).
- `public.search_products_global` — seção de produtos de `/search`.

Única mudança de elegibilidade: `JOIN stores s ON s.id = o.store_id AND s.active = true`
no conjunto `filtered_offers`/`agg`, **antes** da agregação e do `count`, mais
`JOIN product_price` (era `LEFT JOIN`) e remoção do `LEFT JOIN` de `m` em
`search_products_global` — materializando `PUBLIC PRODUCT = ≥1 PUBLIC OFFER`.

Preservados (verificado contra as definições históricas `20260809120000` e
`20260827000000`) **[executado neste repositório]**: nome, argumentos/tipos/defaults,
`RETURNS TABLE (product_id, lowest_price_usd, has_stock, total_count)`, `LANGUAGE sql`,
`STABLE`, `SECURITY INVOKER`, **ausência de `SET search_path`** (o comentário histórico
registra que `SET search_path` bloqueia inlining da SQL function e degrada a ordenação
global para timeout), `COMMENT ON FUNCTION` e `GRANT EXECUTE … TO anon, authenticated,
service_role`. Nenhuma migration histórica foi modificada.

## Database validation

Leitura read-only no PostgreSQL self-hosted de produção **[owner-executed]**:

| Verificação | Resultado |
|---|---|
| `qa-e2e-store-a` (store id `c86290d9-625e-4ed0-bf7e-db893652c98f`) | `active=false`; **5 ofertas `available=true`**; 5 produtos com ofertas disponíveis |
| `qa-e2e-store-b` | `active=false`; 0 ofertas |
| `public.search_products_global('QA E2E', 20, 0)` | **0 rows** (apesar das 5 ofertas `available=true` da loja inativa) |
| `public.search_products_catalog(NULL, NULL, c86290d9-…::uuid, NULL, false, NULL, NULL, 'price_asc', 20, 0)` | **0 rows** |
| Cenário positivo — lojas ativas | `shopping-china` 22922 · `mobile-zone` 7204 · `atacado-connect` 6417 · `mega-eletronicos` 5245 · `roma-shopping` 1564 ofertas disponíveis |
| Catalog RPC — `newest` / `price_asc` / `price_desc` | 12 rows cada, `total_count = 43407` em todas ⇒ eligibility/count/pagination consistentes para o conjunto público |

Conclusão: o banco deixa de ser a origem do vazamento — a regra é aplicada no SQL,
antes de agregar/contar.

## Public regression validation

### Antes da correção (achado do P2, 2026-09-09) **[owner-executed]**

- `GET /search?q=QA E2E` → **200** com os **5 produtos QA** (10 ocorrências de
  `/product/qa-e2e-product-*`).
- `GET /lojas/qa-e2e-store-a` → **200** renderizando a loja inativa + seus 5 produtos.
- `GET /product/qa-e2e-product-005` → **200** renderizando o produto QA.
- Causa então identificada no código **[código]**: (1) as duas RPCs de busca agregavam
  apenas `offers.available = true`, sem `stores.active`; (2) `getStorePublic()` buscava
  por slug sem filtrar `active`. Nota de SEO registrada: as rotas inativas ainda emitiam
  `title`/og da loja QA (metadata gerada antes do estado "não encontrada" no corpo) —
  comportamento a reverificar se voltar a ocorrer.

### Regressão pós-deploy de `dd5b6d2` **[owner-executed]**

- `/lojas/qa-e2e-store-a` e `/product/qa-e2e-product-005` **já protegidos**.
- `/search?q=QA E2E` **ainda exibia os 5 produtos QA** ⇒ regressão isolada em
  `services/search.service.ts` (ver "E2E validation" → hotfix). A RPC de produção já
  devolvia `[]`; o serviço é que não tratava sucesso-vazio como resposta definitiva.

### Após o hotfix `500f1f0` **[owner-executed]**

| Rota | Resultado | Leitura correta |
|---|---|---|
| `/search?q=QA%20E2E` | "Nenhum resultado para \"QA E2E\"" | 0 produtos QA exibidos |
| `/lojas/qa-e2e-store-a` | corpo "Loja não encontrada"; payload contém `NEXT_HTTP_ERROR_FALLBACK;404` | loja inativa não é pública |
| `/product/qa-e2e-product-005` | produto QA exposto = **false**; `NEXT_HTTP_ERROR_FALLBACK;404` presente | produto sem oferta pública não é público |

**Nota de leitura**: `/lojas/[slug]` e `/product/[slug]` podem apresentar HTTP 200 no
transporte devido ao streaming/fallback do Next.js. O status HTTP externo **não** deve
ser interpretado isoladamente como exposição — o sinal correto é o corpo/`notFound()`
(`NEXT_HTTP_ERROR_FALLBACK;404`).

### Gates de código **[executados neste repositório, em `500f1f0`]**

| Gate | Resultado |
|---|---|
| `npx jest` (suíte completa) | **172/172 suítes · 1264/1264 testes PASS** |
| Focados do hotfix | `services/__tests__/search.service.test.ts` **13/13**; com `services/__tests__/public-catalog-visibility.test.ts` **57/57** |
| `npx tsc --noEmit` | PASS |
| `npm run lint` | **0 erros** · 1 warning pré-existente e não relacionado (`scripts/comparison-forensics-audit.ts:19`, `MergeCandidateStatus` não usado) |
| `git diff --check` | limpo |
| `npm run build` | PASS — Next.js 16.2.9, 150/150 páginas estáticas **[owner-executed]** |

## E2E validation

Harness autenticado de **25 checks** (dois tenants QA isolados, Playwright + API).
Ciclos registrados:

| Ciclo | Resultado | Observações |
|---|---|---|
| 1 (2026-09-09) | pendente de execução | bloco `OWNER EXECUTION REQUIRED` entregue ao owner |
| 2 (2026-09-09) | `total=25 pass=23 fail=2` | **#13 real** (contadores de commit — corrigido em `a65ae43`) e **#15 harness** |
| 3 — **final** | `total=25 pass=24 fail=1` | único FAIL: `15_Stock_semantics`, diagnosticado como **falso negativo do harness** |

Comportamentos validados no ciclo final (checks 01–14 e 16–25): API login A/B ·
RLS A vê só o próprio · RLS B vê só o próprio · A não lê authorization de B ·
B não lê authorization de A · browser login A · dashboard 200 · páginas merchant 200 ·
preview sem mutação · commit Store A · exatamente 5 ofertas válidas · reimport sem
duplicatas · `price_history` X→Y · A não faz upload para Store B · A não commita Store B ·
checksum inválido rejeitado · store inválida rejeitada · logout A · browser login B ·
B dashboard 200 · B não commita Store A · 0 erros de console · 0 respostas 5xx.

### Contabilização precisa do ciclo final

- **Execução automatizada: 24/25 PASS.**
- **Check #15 (`15_Stock_semantics`): falso negativo do harness.** O harness procurava
  `String(r.price_usd) === '120.00'` / `=== '50.00'`; o PostgREST serializa `numeric`
  sem zeros à direita (`"120"`, `"50"`), de modo que o `find()` não localizava as linhas.
- **Os dados capturados satisfazem a asserção corrigida** (`Number(r.price_usd) === 120` /
  `=== 50`, `Number(oos.stock_quantity) === 0`): `120 → in_stock=true, quantity=10` ·
  `50 → in_stock=false, quantity=0` · `75 → in_stock=false, quantity=null` ·
  `200 → in_stock=true, quantity=5` · `30 → in_stock=true, quantity=2` — semanticamente
  corretos (`available` ≠ `in_stock`).
- **Nenhuma segunda execução mutante do E2E foi realizada.**

## Harness false negative analysis

**Sintoma**: 1 de 25 checks falha embora o comportamento observado esteja correto.

**Causa raiz**: comparação de `numeric` do PostgREST por representação textual. O
PostgREST serializa `numeric` conforme o valor armazenado, sem reimpôr escala
(`120` e não `120.00`). `String(120) === '120.00'` é `false`.

**Correção aplicada (somente no harness)**: comparação numérica —
`Number(r.price_usd) === 120`, `Number(r.price_usd) === 50`, `Number(oos.stock_quantity) === 0`.

**Impacto**: **zero** em código de produção. Nenhum arquivo de aplicação foi alterado
para satisfazer o harness.

**Limite declarado**: como não houve reexecução (evitando nova mutação), a conclusão
"os 25 comportamentos esperados estão validados" apoia-se em: 24 checks executados com
PASS + dados reais capturados pelo próprio check #15 satisfazendo a asserção corrigida.
Isso **não** é equivalente a "25/25 executados automaticamente" e não deve ser
apresentado dessa forma.

## Known non-blocking follow-ups

Nenhum destes altera código nesta janela; todos são decisões separadas.

| # | Item | Situação |
|---|---|---|
| 1 | Default `fail-open` em helpers equivalentes — `return store ? store.active === true : true` (`services/search.service.ts`, `services/product.service.ts`) | Com o embed presente e com `stores!inner(active)` o caminho é correto; um embed ausente/vazio ainda faz a linha ser tratada como pública. Um default `fail-closed` para gates de **visibilidade** é a evolução recomendada (exige ajustar fixtures legadas que omitem `stores`). |
| 2 | `getProductComparison(productId)` (`services/compare.service.ts`, usado por `GET /api/compare?productId=`) | Ofertas/preços/summary/best-deal já protegidos; o **payload do produto** (identidade) não passa pelo check de PUBLIC OFFER. O caminho por slug (usado pelas páginas) está protegido. |
| 3 | `PriceHistoryQueryService` | Mesmo padrão sem gate explícito; **nenhum consumer call-site atual** (`lib/market-insights-factory` o constrói/expõe, nada o consome). Não refatorado especulativamente. |
| 4 | Métricas históricas de `market_changes` / volatilidade | O score por produto é calculado sobre as mudanças do produto, não escopado por loja. No modelo real (uma linha de `products` por loja) o gate aplicado no serviço já exclui a loja inativa do conjunto pontuado. |
| 5 | Ticker / Market Pulse | Contagens de atividade (`recentlyUpdatedCount`, `dropsCountToday`, `newProductsToday`, `dailyChangeSeries`) agregam `market_changes` sem recorte integral por loja ativa. São números de atividade de mercado, não preço/oferta pública. |
| 6 | Rota inativa e metadata SEO | `title`/og podem ser gerados antes do estado "não encontrada" no corpo (observado no achado original). Reverificar se reaparecer. |
| 7 | Offsets `LIMIT/OFFSET` do catálogo em escala | Custo de agregação/ordenação do catálogo público; revisão de índices/plano é trabalho separado de performance. |

**Não afirmar "zero gaps"**: os itens 1–3 são superfícies/limites reais; nenhum deles é
vazamento de **oferta/preço/estoque/ranking** nas superfícies públicas verificadas.

## QA data / cleanup policy

- **Nada foi apagado.** Nenhum `DELETE`/`UPDATE`/`INSERT` foi executado nesta janela.
- Cleanup é **decisão separada do owner** e precisa considerar dependências:
  `products`, `offers`, `price_history`, `brands`, `imports`, registros de auditoria e
  foreign keys.
- Ordem de cleanup (se e quando aprovado), sempre pelos IDs exatos da seção de tenants:
  `merchant_authorizations` → `merchant_stores` → `merchants` → QA `stores` →
  QA `auth.users` (Admin API, por email). Nunca matching por nome; nunca DELETE global.
- O backup pré-QA (`pg_dump` + `pg_restore --list`) é **mecanismo de emergência**, não
  estratégia normal de cleanup.

### Tenants QA de produção (bootstrapped pelo owner, validado)

Identidades sintéticas únicas: `qa-e2e-merchant-a@fronteiraai.test`,
`qa-e2e-merchant-b@fronteiraai.test`.

| Entidade | ID | Estado |
|---|---|---|
| QA Store A (`qa-e2e-store-a`) | `c86290d9-625e-4ed0-bf7e-db893652c98f` | `active=false`, `is_verified=false` |
| QA Store B (`qa-e2e-store-b`) | `1425fa96-153a-4aea-b82a-4e3cbf982d87` | `active=false`, `is_verified=false` |
| QA Merchant A | `c1190a4f-e98a-4290-80fb-505c6f62675f` | membership → Store A; authz **ACTIVE** |
| QA Merchant B | `14c6e9af-f56a-4969-a32a-2a774a2edd91` | membership → Store B; authz **ACTIVE** |

Post-condições verificadas antes do commit do bootstrap: contagens exatas, zero
cross-tenant (membership e authorization), ambas as authz `ACTIVE`.
Backup pré-QA validado: `/tmp/pre-qa-e2e-20260909-161613.dump` (VPS).

## Final status

**Merchant Console (P1 + checksum + contadores)** — `CODE + AUTHENTICATED PRODUCTION E2E`
= validado: 24/25 checks automatizados PASS no ciclo final; #15 diagnosticado como falso
negativo do harness, com os dados capturados satisfazendo a asserção corrigida.

**Public Catalog Visibility (P2)** — **P2 CLOSED — validated in production for the tested
public surfaces**: `/search`, `/lojas/[slug]` e `/product/[slug]` verificados em produção
após `500f1f0`; RPCs de produção confirmadas com 0 rows para a loja inativa e
`total_count` consistente no cenário positivo.

Ressalvas obrigatórias de leitura (não são ressalvas do resultado, são do *escopo* da
afirmação):

- não implica ausência de vazamento em **toda e qualquer** superfície (ver follow-ups);
- não implica "zero security gaps";
- **não** implica "25/25 testes automatizados PASS" — a formulação correta é
  **24/25 PASS + 1 falso negativo de harness diagnosticado**;
- as evidências de produção são **owner-executed** (read-only); as evidências de código
  são reproduzíveis por `git`/`npm` neste repositório;
- nenhum commit, push, deploy, migration ou cleanup foi executado durante a produção
  deste documento.
