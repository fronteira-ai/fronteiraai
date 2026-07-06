# TECH_DEBT.md

Itens identificados por leitura completa do código. Nenhum é bloqueante hoje (build/lint/TS passam), mas todos custam mais quanto mais tarde forem corrigidos.

## Release 1.9 — Program F — Wave 1 — Premium Home Experience (2026-07-04) — gaps documentados, não corrigidos

Ver `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` para o relatório completo.

- **`EXCHANGE_RATE_API_KEY` não configurada neste ambiente**: `exchange_rates` está vazia em produção — o `ExchangeRateService.refresh()` (Exchange Intelligence, Program A — Wave 1) nunca conseguiu persistir uma cotação real, confirmado via `exchange_provider_runs` (`status: "failure"`). Não é um bug de código — precisa da chave real provisionada. `CambioAoVivo.tsx` degrada honestamente enquanto isso não acontece.
- **Market Pulse/Marketplace em Tempo Real sem dado de `price_increased`/`price_decreased` ainda**: os 4 conectores reais (Program D — Wave 1) só sincronizaram uma vez cada — `market_changes` só tem eventos de criação até agora. Vai se preencher sozinho no próximo ciclo de sync de cada conector, sem mudança de código.
- **Câmeras ao Vivo**: arquitetura preparada (`components/home/LiveCameras.tsx`, contrato `LiveCameraFeed`), zero integração real — aguardando decisão de fonte de stream.
- **Página de detalhe de categoria (`/categorias/[slug]`) não existe** — fora do escopo pedido nesta Wave (só a listagem `/categorias`); cada card de categoria linka para `/products?category=slug` (rota real já existente).

## ✅ Bugs críticos corrigidos (Sprint 3.5)

Os bugs abaixo, confirmados na Sprint 3.4.1 (ADR-008), foram corrigidos na Sprint 3.5 (ADR-009) antes de construir o catálogo de produtos sobre eles:

- ~~`offer.price` não existe no banco~~ — `types/offer.ts` agora usa `price_usd`/`price_brl` (valores independentes, sem conversão). `ProductOffers.tsx`/`StoreOffers.tsx` exibem o preço real.
- ~~`offer.stock` não existe~~ — `types/offer.ts` agora usa `in_stock` (fonte da UI), além de `available`/`stock_quantity` (modelados, ainda sem consumidor).
- ~~`offer.url` não existe~~ — `types/offer.ts` agora usa `product_url`; o botão "Ver oferta" aparece quando a oferta tem o campo preenchido.
- ~~`offer.installments` não existe~~ — campo removido do tipo (sem coluna real equivalente).
- ~~`store.banner_url` não existe~~ — `types/store.ts` agora usa `cover_image`.
- ~~`store.verified` não existe~~ — `types/store.ts` agora usa `is_verified`.

Ver `docs/operations/DECISIONS.md` ADR-009 para o detalhe completo da correção.

## Componentes duplicados / quase-duplicados

- ~~`ProductCard` vs `ProductHighlightCard`~~ — **resolvido na Sprint 3.5** (ADR-010): unificados em um único `ProductCard` com props achatadas (`slug`, `name`, `imageUrl`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?`); `ProductHighlightCard.tsx` removido.
- ~~`ProductBreadcrumb` (só produto) e a trilha inline duplicada em `app/store/[slug]/page.tsx`~~ — **resolvido na Sprint 3.5**: extraído `components/ui/Breadcrumb.tsx` (genérico, com JSON-LD `BreadcrumbList`), reaproveitado por produto, loja e o novo catálogo.
- ~~`constants/routes.ts` só tinha `productPath`/`productUrl`~~ — **resolvido na Sprint 3.4**: `storePath()`/`storeUrl()` adicionados no mesmo padrão; `StoreCard` não usa mais string literal.

## Hooks incompletos

- ~~`useStore` vazio~~ — **resolvido na Sprint 3.4**: implementado, espelha `useProduct.ts`.
- ~~`useSearch` vazio~~ — **resolvido na Sprint 3.3**: implementado, usado por `SearchBar`.
- `useOffers` existe como arquivo vazio. Isso é ambíguo no Git/IDE: parece implementado (aparece no histórico, no autocomplete de import) até ser aberto. Risco real de alguém importar e só descobrir o problema em runtime/build.
- `useFavorites` funciona, mas não tem nenhuma forma de sincronizar entre abas/dispositivos nem de migrar para favoritos por usuário quando autenticação existir — vai precisar de um plano de migração de dados do `localStorage`.

## Tipagem

- Todos os services fazem `return data as Product[]` (cast direto, sem validação) — uma mudança de coluna no Supabase não é pega pelo TypeScript, só em runtime/produção.
- `getStore(id)` não tem tipo de retorno explícito (`Promise<...>` implícito), diferente de todos os outros métodos de service que declaram o tipo de retorno. Desde a Sprint 3.4 também ficou redundante: `getStoreBySlug(slug)` é quem alimenta a página real (`/store/[slug]`); `getStore(id)` continua sem nenhum consumidor (código morto, mantido por não ter sido pedida sua remoção).
- ~~`lib/supabase.ts` usa `process.env.X!`~~ — **resolvido na Sprint 3.2**: `lib/env.ts` é a única fonte de `process.env`, com mensagens de erro distintas para ambiente local/Vercel (ADR-001). Verificado com `npm run build` e com teste manual de `.env.local` ausente.

## Performance

- ~~`ProductCard`, `ProductGallery` (×2), `StoreCard` usam `<img>` nativo~~ — **resolvido na Sprint 4.2**: todos os 5 `<img>` substituídos por `next/image` (fill + sizes + priority no LCP). 0 warnings de lint.
- ~~Fetch duplicado de produto entre `layout.tsx` e `page.tsx`~~ — **resolvido na Sprint 4.1** (ADR-021): `app/product/[slug]/_cache.ts` e `app/store/[slug]/_cache.ts` exportam funções com `React.cache()`; tanto layout quanto page importam do mesmo módulo, compartilhando o escopo de cache dentro de uma requisição — apenas 1 fetch por entidade por visita.
- ~~`app/product/[slug]/page.tsx` e `app/store/[slug]/page.tsx` inteiramente `"use client"`~~ — **resolvido na Sprint 4.1**: convertidos para Server Components `async`. `FavoriteButton`/`ShareButton` continuam como ilhas `"use client"` (estado local necessário), o restante da página renderiza no servidor.

## SEO

- ~~`app/layout.tsx` com metadata padrão do `create-next-app`~~ — **resolvido na Sprint 3.3**: título/descrição reais + JSON-LD `WebSite`/`SearchAction`.
- ~~Só `/product/[slug]` tinha `generateMetadata`~~ — **resolvido na Sprint 3.3** (`/search`) e **Sprint 4.2** (Home com OG/Twitter/canonical, root layout com Organization JSON-LD e robots).
- ~~Sem `sitemap.xml`/`robots.txt`~~ — **resolvido na Sprint 4.2**: `app/sitemap.ts` (dinâmico, Supabase) e `app/robots.ts`.
- ~~Sem 404 global com design de marca~~ — **resolvido na Sprint 4.2**: `app/not-found.tsx`.

## Busca (Sprint 3.3) — limitações conhecidas

- Produtos retornados pela busca não exibem preço — `searchEverything` consulta só `products.name`, sem join com `offers` (preço pertence à oferta, não ao produto, ver `DOMAIN_MODEL.md`). Resolver exigiria uma query agregada (menor preço por produto) ou aceitar N+1 nos resultados.
- `SearchResults`/`Categories.tsx` linkam para `/categories/${slug}`, rota que não existe ainda.
- Sem filtro por tipo, paginação ou autocomplete — cada seção é limitada a 8 resultados (`RESULTS_PER_SECTION` em `search.service.ts`) sem forma de ver mais.

## Domínio de Loja (Sprint 3.4) — limitações conhecidas

- ~~Contato e horário de funcionamento não implementados porque não existem como colunas em `stores`~~ — **corrigido na Sprint 3.4.1** (achado: as colunas já existiam) **e implementado na Sprint 3.5** (ADR-009): `StoreDetails.tsx` agora exibe telefone/WhatsApp/e-mail/site/endereço/horário quando a loja tem esses dados preenchidos.
- ~~Achado de dados: as 5 lojas reais no Supabase têm `slug: null`/`active: null`, e `products`/`offers`/`brands`/`categories` vazias~~ — **resolvido a nível de banco na Sprint 3.8** (ADR-007 fechado, ver ADR-016): seed executado com sucesso, `stores` com `slug`/`active` preenchidos, 5 brands/categories, 6 products, 9 offers. **Correção (adendo Sprint 3.9, ADR-019): a frase original dizia que isso tornava os dados "navegáveis em produção" — isso não foi verificado com a chave anônima na época, e confirmou-se depois que está errado** (ver item crítico no topo deste documento). Os dados existem no banco; a aplicação real provavelmente não os enxerga ainda.
- **Achado novo (Sprint 3.6)**: nem todo o conteúdo de loja está ausente — `website` e `opening_hours` já estão preenchidos nas 5 lojas reais, e `address` em 4 das 5 (só falta `slug`, `active` e `cover_image`). Uma pequena inconsistência de qualidade de dado também apareceu: `whatsapp` é string vazia (`""`) em uma loja, em vez de `null` como nas demais — verificado que `StoreDetails.tsx` (`store.whatsapp ? ... : null`) já trata `""` como ausente corretamente (string vazia é falsy em JS), então não é um bug de código, só um dado a normalizar quando o backfill da Sprint 3.7 acontecer.
- **Avaliações** — seção "Avaliações em breve" usa `EmptyState` genuinamente vazio (sem reviews mocadas), porque `types/review.ts` e a tabela `reviews` ainda não existem (ver `DOMAIN_MODEL.md`). Vira uma seção real só quando o domínio de Reviews for implementado.
- **"Produtos da loja" e "ofertas" unificados em `StoreOffers`** — decisão deliberada para não duplicar lógica/templates: cada oferta da loja já mostra o produto (nome + link) e os termos da oferta (preço, estoque, garantia, cashback) na mesma linha, em vez de duas seções separadas mostrando os mesmos dados de formas diferentes.
- Links de `/categories/[slug]` (ver seção Busca acima) continuam mortos; `/stores` (listagem de lojas, distinta de `/store/[slug]`) também continua sem rota própria — só `/products` foi fechado nesta sprint.

## Catálogo de produtos (Sprint 3.5) — limitações conhecidas

- **Ordenação por preço é "best effort"** — `getProductsCatalog` corrige a ordem da página já buscada (sempre correta para o que é exibido), mas não garante ordem global perfeita entre páginas diferentes em catálogos grandes, porque o PostgREST não ordena nativamente por uma agregação (`MIN(offers.price_usd)` por produto) sem uma view/RPC. Proposta de correção (materialized view, não aplicada): `database/migrations/0003_proposed_product_catalog_price_view.sql`. Ver `docs/operations/DECISIONS.md` ADR-011. Filtros (categoria/marca/loja/disponibilidade/faixa de preço) e paginação **não** têm essa limitação — são resolvidos nativamente via `offers!inner` e são corretos e escaláveis hoje.
- **"Mais vendidos"/"Melhor avaliação" são estrutura preparada, não funcionais** — `ProductCatalogSort` inclui `best_selling`/`top_rated` e a UI (`ProductFilters`) já oferece as opções (marcadas "em breve"), mas o serviço cai em `created_at desc` para ambos, porque não existe nenhuma coluna de contagem de vendas ou nota média por produto no schema real hoje. Vira funcional quando esses dados existirem (ex.: contagem agregada de pedidos, ou média de `reviews` quando esse domínio existir).
- Sem dados reais (`products` vazia, ver achado de dados acima), o catálogo não pôde ser testado manualmente contra resultados reais nesta sprint — validado estruturalmente (lint/typecheck/build) e por leitura de código.

## Fundação de dados (Sprint 3.7/3.8)

- ~~Seed implementado, não testado contra escrita real~~ — **resolvido na Sprint 3.8**: `npm run db:seed:execute` rodou com sucesso usando `SUPABASE_SERVICE_ROLE_KEY` (a chave anônima de fato não tem permissão de escrita por RLS em `brands`/`categories`/`products`, confirmado ao vivo — ver ADR-016). Banco hoje: `stores: 5` (slug/active preenchidos), `brands: 5`, `categories: 5`, `products: 6`, `offers: 9`.
- ~~Achado: `database/seed/index.js` (backfill de `stores`) loga `[OK]` mesmo quando a RLS filtra o `UPDATE` silenciosamente~~ — **corrigido na Sprint 3.9** (ADR-016/ADR-017): o `UPDATE` agora usa `.select("id")` e loga `[AVISO]` quando 0 linhas são afetadas, em vez de assumir sucesso. Testado contra o Supabase real com a chave anônima (cenário que reproduz o bug original) — confirmado que a detecção funciona.
- **Detecção de oferta "órfã" em `validate.js` é por `IS NULL`, não por anti-join real** — agora com 5/5/6/9 linhas, a Sprint 3.8 fez uma auditoria complementar em memória (anti-join real, com a chave de serviço) e confirmou 0 FKs órfãs hoje; `validate.js` em si continua sem essa verificação (não escala para volume real via fetch-and-diff). Quando houver mais volume, precisa de uma consulta dedicada (ou um RPC).
- **Offer Ranking (ADR-014) continua arquitetura, não código** — nenhuma ordenação nova implementada; `getOffersByProduct`/`getOffersByStore` continuam ordenando só por `price_usd`.

## ✅ RESOLVIDO — leitura pública desbloqueada (ADR-019, 2026-06-25)

- ~~`brands`/`categories`/`products`/`offers`/`price_history` retornavam `[]` para a chave anônima~~ — **resolvido na Sprint 4.1, hotfix (ADR-019)**: `0007_proposed_public_read_policies.sql` aplicada no SQL Editor pelo CTO. Validação com `validate_adr019.js`: 22/22 OK usando exclusivamente a chave anônima. Todas as 6 tabelas públicas são legíveis; escrita continua bloqueada para `anon`/`authenticated`.

## Price Engine v1 (Sprint 3.9, validado no adendo) — limitações conhecidas

- ~~`price_history` ainda não existe no Supabase real~~ — **resolvido**: o CTO aplicou `0006_proposed_price_history.sql` manualmente no SQL Editor.
- ~~Bug de cálculo em `getOfferPriceMetrics`~~ — **encontrado e corrigido durante a validação do adendo**: a função ignorava o preço original (só disponível em `old_price_usd` da primeira entrada de histórico) ao calcular `highestPriceUSD`/`priceChangePercent`. Corrigido e testado com 27 asserções contra dados reais. Ver ADR-018.
- **`updateOfferPrice()`/`getOfferPriceMetrics()` herdam o bloqueio de RLS** — a chave anônima não escreve em `price_history`/`offers` (ADR-018). Quando o Admin (Release 0.7) ou Crawler (Release 0.8) existirem, vão precisar de policy de RLS dedicada para escrita.
- ~~`/compare` não existe~~ — **resolvido na Sprint 4.0**: `services/compare.service.ts` usa batch de `price_history` (3 queries por comparação) em vez de chamar `getOfferPriceMetrics()` N vezes; `app/compare/[slug]/` e `app/api/compare/` entregues. Ver ADR-020.

## Compare Engine v1 (Sprint 4.0) — limitações conhecidas

- **Chave anônima bloqueada (ADR-019)**: `/compare/[slug]` e `/api/compare` retornam vazio/404 para usuários reais até `0007_proposed_public_read_policies.sql` ser aplicado. Bloqueio pré-existe à sprint — afeta todo o catálogo, não só o comparador.
- **Compare Engine compara um produto de cada vez**: a missão do Release 0.5 previa "tela de seleção (2–4 produtos) com tabela de especificações lado a lado" para comparar N produtos. O que foi entregue é `/compare/[slug]` (um produto, todas as lojas). A comparação lado a lado de N produtos distintos fica para a Sprint 4.1 ou posterior, quando a leitura pública estiver desbloqueada e houver mais dados reais.
- ~~**Sem link "Comparar" nos cards de produto**~~ — **resolvido na Sprint 4.1**: botão "Comparar preços" adicionado em `app/product/[slug]/page.tsx` (ao lado dos botões Favoritar e Compartilhar), linkando para `comparePath(product.slug)`.
- **Ranking de loja sem view materializada**: o score usa `store.rating` da query de ofertas (campo existe e é atualizado pelo seed). A `store_ranking_summary` proposta em `0005_proposed_store_ranking_view.sql` aumentaria a precisão do score com `offer_count`/`in_stock_offer_count` — não necessária agora, mas candidata quando o volume crescer.

## Data Integrity & Storage (Sprint 4.3)

- ~~`0008_data_integrity.sql` criada, não aplicada~~ — **resolvido em 2026-06-26** (correção de staleness feita no Sprint Zero, 2026-07-02): `docs/operations/PROJECT_STATUS.md` já registra "Migration 0008 aplicada... confirmados no banco" desde essa data. Esta entrada estava desatualizada há mais de uma semana de trabalho real — corrigida agora, não porque mudou, mas porque nunca tinha sido atualizada aqui.
- **Imagens reais ausentes**: bucket `catalog` criado e URL strategy definida (ADR-022), mas `image_url`/`cover_image`/`logo_url` no banco continuam nulos. A UI exibe estado vazio (`<div className="flex h-full w-full items-center justify-center">`) para todas as imagens até o upload acontecer. `utils/storage.ts` → `resolveImageUrl` está pronto para quando as imagens existirem.
- **`utils/storage.ts` não é usado por nenhum componente ainda**: o utilitário foi criado, mas nenhum `ProductCard`/`StoreCard`/`ProductGallery` usa `resolveImageUrl` como fallback ainda — a integração fica para quando o bucket tiver conteúdo real.

## Acessibilidade

- `Navbar`/`Footer`/diversos componentes não têm problemas graves visíveis, mas não há testes/varredura de a11y configurada (sem `eslint-plugin-jsx-a11y` explícito além do que `eslint-config-next` já cobre).
- `components/ui/Input.tsx` e `components/ui/Select.tsx` (Sprint 3.5) usam `<label>`/atributos nativos do elemento, mas não foram auditados formalmente. `components/ui/SearchInput.tsx` continua vazio — reservado para um campo de busca com ícone embutido, distinto do `Input` genérico.

## Suspense / Streaming / Loading / Error Boundaries

- `app/product/[slug]/` tem o conjunto completo (`loading.tsx`, `error.tsx`, `not-found.tsx`); `app/search/` ganhou `loading.tsx`/`error.tsx` na Sprint 3.3; `app/products/` ganhou o mesmo conjunto na Sprint 3.5 (sem `not-found.tsx` em nenhum dos dois — não se aplica, listas sem resultado não são 404). `/` (Home) ainda não tem nenhum dos três — uma falha de fetch futura (quando ela parar de usar mock) não terá tratamento de erro de página.
- ~~Nenhum uso de `<Suspense>` explícito~~ — **parcialmente resolvido na Sprint 3.3, ampliado na Sprint 3.5**: `app/search/page.tsx` e `app/products/page.tsx` usam `<Suspense>` para a seção de resultados (filtros/cabeçalho renderizam fora do Suspense, sem esperar a query paginada). Ainda não é um padrão usado em `/product/[slug]`/`/store/[slug]` (página inteira client) ou na Home.

## Brain event registry — 21 tipos sem mapeamento (achado da Wave 4, 2026-07-01)

Um teste de completude escrito para a Wave 4 (Canonical Catalog, `src/domains/trust/events/__tests__/event-registry.test.ts`) descobriu que 21 `TrustEventType` do Release 1.6 (analytics: `analytics_merchant_location_viewed`/`analytics_offer_viewed`/`analytics_offer_clicked`/`analytics_brand_viewed`; catalog-intelligence: 5 eventos `catalog_*`; growth: 12 eventos `growth_*`) nunca ganharam entrada em `TRUST_EVENT_BRAIN_IMPACT` (`getBrainImpact()` retorna `[]` para todos eles hoje). Não é um bug bloqueante — nenhum código depende de `getBrainImpact()` retornar não-vazio para esses eventos ainda —, mas é uma lacuna real de documentação do impacto no Brain. Fora do escopo da Wave 4 (que só adicionou os 10 eventos do Canonical Catalog); registrado aqui para uma sprint de manutenção futura em vez de expandir silenciosamente o escopo desta Wave.

**Nota (Release 1.8, Program 0 Wave 0, 2026-07-02)**: a ponte Brain↔`buyer_events` construída nesta Wave usa apenas `TrustEventType.MerchantViewed`/`MerchantPassportViewed`/`MerchantContactClicked` — todos já tinham entrada em `TRUST_EVENT_BRAIN_IMPACT` antes desta Wave. Este achado (os 21 tipos ainda sem mapeamento, incluindo os `analytics_*` prefixados que a ponte deliberadamente não usa — ver `RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md`) continua **não corrigido**.

## Wave 6 — Platform Hardening (2026-07-02) — achados não corrigidos nesta Wave

- **Sem rate limiting em nenhum endpoint de mutação** — confirmado por auditoria: `/api/merchant/claims`, `/api/merchant/delegates`, `/api/merchant/upgrade-interest` e todo o restante da API dependem só de autenticação de sessão (a única exceção parcial é `/api/analytics/events`, que tem lógica de batching mas não rate limiting real). Severidade baixa hoje (exige sessão autenticada válida, não é anônimo), mas construir a infraestrutura (Redis/Upstash ou equivalente) é uma capacidade nova, fora do mandato "sem features" da Wave 6 — ver ADR-042 parte 3. Candidato ao Release 1.8 se o volume de merchants justificar.
- **`proxy.ts` (ex-`middleware.ts`) não cobre `/api/admin/**` nem `/api/merchant/**`** — o `matcher` só redireciona `/admin/:path*` e `/merchant/:path*` (páginas). Seguro hoje porque toda rota de API já se autoguarda individualmente (`requireAdmin()`/`requireMerchant()`/`requireMerchantContext()`, confirmado 100% de cobertura na auditoria da Wave 6), mas é uma dependência implícita: qualquer rota de API nova precisa lembrar de chamar seu próprio guard — o proxy não pega o esquecimento. Next.js recomenda explicitamente não confiar só no proxy para isso; nenhuma mudança de código proposta, só o registro do risco para quem adicionar rotas novas.
- **`connector_configs` (migration `0010`) e `import_logs` (Release 0.9) continuam marcadas "superadas", não removidas** — `connector_configs` já não tem nenhum call site (confirmado por grep, zero referências); `import_logs` teve suas 4 leituras remanescentes (`app/admin/page.tsx`, `app/api/admin/dashboard/stats/route.ts`, `CatalogIntelligenceService.ts`, `ExecutiveSummaryService.ts` — todas congeladas desde a Wave 2, quando as escritas pararam) migradas para `connector_sync_runs` durante a Wave 6. Nenhuma das duas tabelas foi removida do banco — decisão deliberada, mesmo padrão de `0022`-`0024`/`connector_configs`: dropar uma tabela em produção exige uma migration de rollback nomeada e o aval do CTO, não é feito silenciosamente por uma sessão de hardening.
- **5 serviços (pré-Wave 4/5) embutem `supabase.from(...)` direto em vez de passar por um repositório** — `catalog-intelligence/services/ProductHealthService.ts`, `growth-engine/services/GrowthContextBuilder.ts`, `merchant-decision/services/DecisionContextBuilder.ts`, `merchant-intelligence/services/{CatalogIntelligenceService.ts, ExecutiveSummaryService.ts}`. Padrão do Release 1.6, anterior à convenção repository-first que `connectors/`/`product-identity/`/`canonical-catalog/`/`merchant-ownership/`/`trust/` seguem à risca. `GrowthContextBuilder`/`DecisionContextBuilder` também reimplementam a própria wiring de `MerchantAnalyticsService` em vez de reaproveitar `lib/analytics-factory.ts`. Nenhum bug de comportamento — só uma inconsistência de padrão (DRY), fora do escopo de correção da Wave 6 (nenhuma regra de negócio muda), candidata a uma sprint de manutenção futura.

## Sprint Zero — Auditoria Organizacional Completa (2026-07-02)

Auditoria de higiene de código conduzida antes do início do Release 1.8 (mandato do CTO: "preparar o ambiente sem gerar dívida técnica"). Cobre `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `constants/`, `scripts/`, `database/`, `supabase/`, `app/`. Nenhum item abaixo foi corrigido — apenas registrado e classificado, conforme instrução explícita do CTO ("se forem encontradas dívidas técnicas relevantes, NÃO corrigi-las").

### ✅ Crítico — resolvido no Release 1.8, Sprint 0.1 (Critical Readiness Fixes, 2026-07-02)

- ~~`hooks/useAnalytics.ts` nunca é importado em nenhum lugar do repositório~~ — **causa raiz encontrada e corrigida**: não era um esquecimento de wiring — **as migrations `0018`-`0021` (Analytics, Decision Engine, Catalog Intelligence, Growth Engine — todos os 5 Epics do Release 1.6 a partir do Epic 2) nunca haviam sido aplicadas em produção**, confirmado por query direta contra `information_schema.tables`. Não havia tabela para o hook escrever. As 4 migrations foram movidas para `supabase/migrations/` e aplicadas via `db:push` em 2026-07-02 (ver `database/migrations/README.md`); `useAnalytics` foi conectado em 3 pontos mínimos (`BuyerSessionTracker` global em `app/layout.tsx`, `ProductViewTracker` em `/product/[slug]`, `StoreViewTracker` em `/lojas/[slug]`, `SearchViewTracker` em `/search`) — sessão + evento verificados chegando de fato no banco via teste end-to-end real contra a API (`POST /api/analytics/session` → `POST /api/analytics/events` → confirmado via query direta, depois removido). Cobertura deliberadamente mínima, não exaustiva — instrumentar todo o site é trabalho de Wave, não deste Sprint de correção. Ver `docs/product/releases/RELEASE_1_8_SPRINT_01_REPORT.md`.
### ✅ Crítico — resolvido no Release 1.8, Program 0 Wave 0 (Brain Analytics Integration, 2026-07-02)

- ~~O Brain não recebe nenhum `buyer_events`~~ — **construído e verificado end-to-end contra produção**: `BuyerEventBrainBridgeService` (novo, `src/domains/merchant-analytics/services/`) roda sincronamente dentro de `EventPlatformService.processEvent`/`processBatch`, logo após cada insert em `buyer_events` — sem fila, sem cron. Só eventos com `merchant_id` resolvido cruzam a ponte (`MerchantViewed`, `MerchantPassportViewed`, cliques de contato consolidados em `MerchantContactClicked` + `contact_channel`); identidade sempre pseudônima (`buyer_id ?? anonymous_id`, nunca em `created_by` — FK para `profiles(id)`, nunca em metadata bruta com PII). Achados adicionais durante a construção, todos corrigidos ou nomeados — ver `docs/product/releases/RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md` para o detalhamento e evidências completas:
  - `CognitiveBrainService.ingest()` (existente desde Release 1.5 Epic 4) nunca tinha sido chamado por código de produção — só por testes — e tinha um bug real de FK (`created_by` recebia `actor_id` incondicionalmente, violando a FK para `profiles` sempre que o ator era um comprador pseudônimo). Corrigido na fonte.
  - `KnowledgeGraphService` (mesma situação — construído e testado, nunca consultado) tinha `deriveRelationsFromEvent()` lendo `event.created_by` para identificar o comprador — que nunca seria populado para eventos de comprador pela mesma razão acima. Corrigido para ler `metadata.buyer_pseudonym` primeiro.
  - **Zero lojas reivindicadas em produção hoje** (`merchant_stores` vazio, 2 merchants em rascunho, zero claims aprovadas) — o mecanismo é real, mas não há substrato real para ele processar ainda. Não é um bug desta Wave.
  - `src/domains/trust/tests/*.test.ts` (não `__tests__/`) nunca são descobertos pelo Jest (`testMatch` exige `__tests__/`) — arquivos de teste existentes para o domínio trust (`TrustFlow.integration.test.ts`, `trust.validators.test.ts`, `types.test.ts`) nunca rodaram via `npm test`. Não corrigido (mover/renomear está fora do escopo desta Wave — risco de mascarar falhas pré-existentes nunca vistas); os novos testes desta Wave foram colocados corretamente em `__tests__/`.

### ✅ Crítico — resolvido no Release 1.8, Sprint 0.1

- ~~`/store/[slug]` e `/lojas/[slug]` são rotas duplicadas~~ — **corrigido**: `/lojas/[slug]` definida oficialmente como canônica. `/store/[slug]` removida do código; redirect 308 permanente (`next.config.ts`, `/store/:slug` → `/lojas/:slug`) verificado funcionando em tempo real (`curl` contra servidor de produção local, status 308 confirmado). `app/sitemap.ts` — o `case "stores"` (que indexava a rota removida) foi eliminado; o `case "lojas"` que sobrava passou de `getStoresRanking(100)` (top-100 apenas) para `getStores()` (todas as lojas), para que remover a duplicata não encolhesse silenciosamente a cobertura de SEO. `app/robots.ts` (lista de sitemaps hardcoded separadamente) também corrigido. `constants/routes.ts`: `storePath`/`storeUrl` removidos, substituídos por `lojaPath`/`lojaUrl` (nome correspondendo à rota real); único call site (`StoreCard.tsx`) atualizado. Link morto adicional encontrado e corrigido no mesmo escopo: `components/home/FeaturesStores.tsx` linkava para `/stores` (rota inexistente), corrigido para `/lojas`.

### 🟠 Alto

- **2 páginas admin construídas e nunca alcançáveis pela UI**: `app/admin/catalog/offers/[id]/page.tsx` (edição de oferta completa) e `app/admin/trust/verifications/[id]/page.tsx` (detalhe de verificação com evidências/histórico/ações) — nenhuma das duas tem um `Link` apontando para elas em nenhum lugar do código; as páginas de listagem correspondentes fazem as ações inline via API em vez de navegar para o detalhe. Trabalho real, não utilizável hoje.
- **Links mortos no Merchant Dashboard**: múltiplas estratégias de `growth-engine`/`merchant-intelligence` apontam `action_url`/`actionHref` para `/merchant/catalog`, rota que não existe (a página real é `app/merchant/products/page.tsx`). Qualquer card de recomendação que renderize essa URL é um link morto clicável hoje.
- **`components/home/FeaturesStores.tsx:32` linka para `/stores` (plural, sem segmento dinâmico)** — rota que não existe; quase certamente deveria ser `/lojas`.

### 🟡 Médio

- **Duplicação significativa entre `components/merchant/decision-center/widgets/` e `components/merchant/growth-center/widgets/`** — 5 pares de widgets com propósito claramente sobreposto (`CompletedImprovementsWidget`/`CompletedGrowthWidget`, `OpportunitiesWidget`/`TopOpportunitiesWidget`, `RecommendationsWidget`/`RecommendationHistoryWidget`, `TodaysPrioritiesWidget`/`TodaysPlanWidget`), incluindo um `GrowthTimelineWidget` **idêntico em estrutura** existindo em ambas as pastas, cada um consumindo um domínio de dado diferente (`merchant-decision` Release 1.6 Epic 3 vs. `growth-engine` Release 1.6 Epic 5). O Growth Engine parece ter superseded conceitualmente o Decision Center sem que o mais antigo fosse removido — ambos continuam ativos no dashboard (`app/merchant/dashboard/page.tsx`).
- **3 hooks mortos, resquício da conversão para Server Components (Sprint 4.1)**: `hooks/useCompare.ts`, `hooks/useProduct.ts`, `hooks/useStore.ts` — nunca importados; consistente com o padrão já documentado para `getStore(id)` acima (código pré-migração para Server Components, nunca removido).
- **`GlassCard.tsx` vs. `GradientCard.tsx`** — wrappers quase idênticos (mesma estrutura, diferindo só no tratamento visual de fundo); `GlassCard` adicionalmente não tem nenhum importador (código morto).
- **`Badge.tsx` vs. `Chip.tsx`** — propósito visual sobreposto (pill arredondado com borda/fundo); `Chip` suporta `onClick`, `Badge` não.
- **`ProductGridSkeleton.tsx` vs. `SearchResultsSkeleton.tsx`** — markup de skeleton quase idêntico reimplementado duas vezes.
- **`lib/supabase.ts` vs. `lib/supabase/client.ts`** — dois caminhos distintos para obter um client Supabase de browser/anon (um arquivo irmão, um dentro de uma pasta de mesmo nome) — smell de organização, não um bug (call sites atuais não colidem), mas confuso para quem só olha a árvore de pastas.
- **4 scripts `validate*.js` em `database/seed/` com escopo sobreposto**, dos quais 2 (`validate_adr019.js`, `validate_compare.js`) são scripts de uma vez só (ADR-019, Sprint 4.0), nunca conectados a `package.json`, e reimplementam seu próprio parsing de `.env.local`/criação de client em vez de reaproveitar `database/seed/lib/client.js` como `validate.js` já faz corretamente.
- **`app/lojas/[slug]/` sem `error.tsx`** (tem `loading.tsx`/`not-found.tsx`, diferente dos 3 irmãos `compare/[slug]`/`product/[slug]`/`store/[slug]`, que têm os 3). **`app/lojistas/[merchantId]/` sem nenhum dos 3** (`loading.tsx`/`error.tsx`/`not-found.tsx`), apesar de fazer fetch assíncrono e chamar `notFound()` internamente. **`app/` raiz sem `error.tsx`** — nenhum error boundary global.
- **`database/sql/` está funcionalmente vazio** (só `.gitkeep`), apesar de `CLAUDE.md` descrevê-lo como contendo "os scripts reais de migration e seed" ao lado de `database/migrations`/`database/seed` — descompasso entre documentação e realidade, achado do Sprint Zero.

### 🟢 Baixo

- 2 páginas redirect-stub (`app/merchant/page.tsx`, `app/merchant/imports/history/page.tsx`) — comportamento intencional (redirect puro), não um bug, mas vale confirmar que ambas são deliberadas e não esquecidas.
- 4 arquivos vazios já conhecidos, agora confirmados sem nenhum importador em lugar nenhum: `components/ui/Card.tsx`, `components/ui/Loading.tsx`, `components/ui/SearchInput.tsx`, `hooks/useOffers.ts`.
- `components/merchant/dashboard/NextStepCard.tsx` — código morto, sem importador (achado novo, não estava na lista de placeholders conhecidos).
- 11 arquivos de placeholder vazios em `lib/`/`utils/`/`types/`/`constants/`, todos do commit de scaffold inicial, todos confirmados sem nenhum importador — já loosely documentados abaixo ("Outras observações de organização"), agora precisamente enumerados: `utils/format.ts`, `utils/validators.ts`, `types/review.ts`, `types/user.ts`, `constants/{colors,config,countries,currencies,navigation,restrictedProducts,categories}.ts`.
- `utils/storage.ts` (`catalogStorage`/`resolveImageUrl`) — já documentado acima como "não usado por nenhum componente ainda"; confirmado por esta auditoria também sem nenhum importador.
- Timestamps de `supabase/migrations/*.sql` (todos no mesmo dia, exatamente 100 segundos entre si) parecem gerados manualmente em vez de organicamente via `supabase migration new` — cosmético, sem efeito funcional (ainda monotonicamente crescentes, sem colisão).

### ✅ Confirmado limpo por esta auditoria (registrado para não precisar re-verificar)

Nenhum script órfão em `scripts/` (todos referenciados em `package.json` ou importados por outro script); zero TODO/FIXME/HACK reais em `components/`/`hooks/`/`lib/`/`utils/`/`types/`/`constants/` (só falsos positivos da palavra "todos" em português) — o único TODO real do projeto inteiro continua sendo o já conhecido `app/api/merchant/imports/run/route.ts:32` (Epic 2, autorização de conector); zero pastas vazias em `app/`, `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `constants/`, `scripts/`, `database/`, `supabase/`; zero arquivos com nome experimental/temporário (`*-old`, `*-backup`, `*_v2`, `scratch*` etc.) em nenhum desses diretórios; todos os 7 `lib/*-factory.ts` estão de fato conectados a rotas/serviços reais; a separação `database/migrations/` (0001-0021, congelada) vs. `supabase/migrations/` (0022+, timestamped) não tem colisão e é intencional, já documentada em `database/migrations/README.md`.

## Outras observações de organização

- ~~Arquivos ainda rastreados pelo Git como vazios~~ — **superado pela auditoria do Sprint Zero** (seção acima, 🟢 Baixo) — a lista foi re-verificada arquivo por arquivo com confirmação de zero importadores, em vez da enumeração solta original. `services/ai.service.ts` e `styles/{theme,typography,spacing,radius,shadows}.ts` não foram re-auditados nesta passagem (fora do escopo dos 4 audits do Sprint Zero) — continuam presumivelmente vazios, não reconfirmados nesta data.
- ~~`database/migrations`/`seed`/`sql` praticamente vazios~~ — **completamente desatualizado, corrigido no Sprint Zero (2026-07-02)**: esta entrada datava de quando o projeto tinha 2 migrations propostas e nenhuma aplicada. Hoje (Release 1.7 certificado) existem 21 migrations em `database/migrations/` (todas aplicadas, congeladas desde a adoção do Migration System V2, ADR-040) mais 5 em `supabase/migrations/` (aplicadas via `db:push`, confirmado). `database/seed/` tem um sistema de seed funcional e testado contra produção. Só `database/sql/` permanece genuinamente vazio (funcionalmente, só `.gitkeep`) — ver achado 🟡 Médio do Sprint Zero acima. Esta entrada é o exemplo mais claro encontrado nesta auditoria de por que "documentação desatualizada é corrigida, não ignorada" (`docs/README.md`, regra permanente do Knowledge System) — ficou errada por mais de 20 migrations de distância sem ninguém notar.
- ~~`package.json` script `format` (Prettier) quebrado~~ — **resolvido na Sprint 3.2**: removido por não haver `prettier` instalado (ADR-003). Adotar Prettier formalmente (com `.prettierrc` + `eslint-config-prettier`) é uma decisão própria, ainda não tomada.
- ~~`.env.example` nunca chegava ao Git~~ — **resolvido na Sprint 3.2**: `.gitignore` tinha uma regra `.env*` sem exceção; corrigido com `!.env.example`, e o arquivo foi movido de `lib/.env.example` (local não convencional) para a raiz (ADR-002).

---

## Release 1.8 — Program 0 — Wave 1 — Marketplace Operations Platform (2026-07-03) — gaps documentados, não corrigidos

Achados nomeados deliberadamente durante a construção do domínio `src/domains/marketplace-operations/` — nenhum é um bug, todos são limites reais de dado hoje disponível, documentados em vez de mascarados por um número inventado.

- **Sem coluna de segmento em `stores`**: Coverage Engine (Epic 4) não reporta cobertura por "segmento" nem por faixa de preço, como o brief original pedia — `stores` não tem coluna de segmento, e inventar uma taxonomia derivada apresentaria dado adivinhado como fato. Cobertura por categoria/marca/cidade (colunas reais) foi implementada normalmente.
- **Sem flag de premium nem instrumentação de SEO**: Merchant Priority Engine (Epic 3) não pondera "Premium" nem "SEO" como fatores — nenhum dos dois existe neste código ainda (Premium é Program F/Wave 8, SEO é Program D/Wave 5). Os pesos desses dois fatores são simplesmente ausentes da fórmula (não zero disfarçado de dado real).
- **Sem contagem de retries em `connector_sync_runs`**: Connector Health Engine (Epic 5) não reporta "retries" — não existe nenhuma coluna ou mecanismo de retry neste schema. Se observabilidade de retry se tornar necessária, é uma migration nova, não uma inferência do formato de `errors` (jsonb).
- **"Latência" reportada é duração de execução, não latência por requisição**: `connector_sync_runs` só tem `started_at`/`completed_at` — o fator é chamado de "duração" no código (`avgDurationSeconds`), não "latência", para não fingir uma precisão que o dado não tem.
- **"Atualizações de estoque/hora" não existe**: só `price_history` é rastreado ao longo do tempo; não há tabela equivalente para estoque. `SyncMetrics.getSyncRateMetrics()` não expõe esse número — computá-lo a partir de `offers.updated_at` confundiria mudanças de preço/estoque/descrição/imagem, todas tocando a mesma coluna.
- **"Relações de Conhecimento" (Knowledge Graph) não é agregado marketplace-wide**: `KnowledgeGraphService.deriveRelationsFromEvent()` (Release 1.5) deriva relações sob demanda por merchant — não existe uma contagem persistida de todas as relações do marketplace. `MarketplaceMetricsSnapshot.knowledgeRelations` é `null` deliberadamente (não zero) quando não agregado.
- **Merchant Priority Engine é compute-on-read, sem histórico de tier**: decisão arquitetural desta Wave (ver `MerchantPriorityService.ts`) — sem uma segunda fonte de verdade persistida para prioridade. Consequência: `TrustEventType.MerchantPriorityTierChanged` está registrado na taxonomia e tem uma factory function pronta (`marketplace-operations.events.ts`), mas **não é emitido nesta Wave** — detectar uma mudança real de tier exigiria saber o tier anterior, que não existe em lugar nenhum ainda. Mesma postura do Product Identity Engine em Shadow Mode (Release 1.7 — Wave 3): explainability pronta, emissão adiada.
- **Agregação por categoria/marca em memória, não `GROUP BY`**: `CatalogMetrics.getCategoryCoverage()`/`getBrandCoverage()` buscam todas as linhas de `products.category_id`/`brand_id` e agrupam em JavaScript — aceitável no catálogo atual, precisa virar uma agregação no Postgres perto de 500 mil produtos. Ver `docs/engineering/MARKETPLACE_FOUNDATION_SCALE_AUDIT.md` para o ponto de virada e a mitigação recomendada.
- **`ConnectorHealthSummary.importedItems` é um único número, não "produtos" e "ofertas" separados**: `connector_sync_runs.totals` (PipelineMetrics) só rastreia um contador `persisted` — não há um contador distinto de produtos-vs-ofertas por execução. Reportar dois números idênticos teria sido desonesto; um número real e nomeado corretamente foi preferido.

---

## Release 1.8 — Program A — Wave 1 — Exchange Intelligence Platform (2026-07-03) — gaps documentados, não corrigidos

- **Terceira superfície pública sem rate limiting real**: `/api/exchange/current`, `/history`, `/convert` seguem a mesma postura de `/api/compare`/`/api/canonical-catalog/[slug]` — nenhum rate limiting real (o único "rate limiting" deste projeto, em `/api/analytics/events`, é um contador em memória já documentado como "não real", pois instâncias serverless da Vercel não compartilham memória). `proxy.ts` não cobre nenhuma rota `/api/**`. Mais urgente agora que existem três superfícies públicas com este gap, não uma — ver ADR-042 parte 3.
- **Cache em memória não é compartilhado entre instâncias serverless**: `ExchangeRateCache` (TTL 60s) é por processo — em produção na Vercel, cada instância mantém seu próprio cache. Inofensivo aqui porque o pior caso é uma leitura extra no Postgres (a linha em `exchange_rates` já tem no máximo ~5 minutos de idade, garantido pelo cron), não uma inconsistência real de dado.
- **Multi-provider é mecanismo, não múltiplos provedores reais**: `ExchangeProviderRegistryImpl` suporta N provedores por prioridade com failover real, mas apenas `ExchangeRateApiProvider` (ADR-043) está registrado. Banco Central do Paraguai/Brasil, AwesomeAPI e "provedor próprio" (pedidos no brief original) não foram implementados — ADR-043 já pesquisou e rejeitou essas alternativas para a cadência de 5 minutos aprovada (bancos centrais só publicam diariamente; scraping próprio é complexidade sem problema real, `NORTH_STAR.md` §7). Adicionar um segundo provedor real exige pesquisa própria (custo/confiabilidade/cobertura de PYG) e sua própria ADR — ver ADR-047.
- **Valorização de catálogo é uma aproximação, não um snapshot diário real**: `ExchangeAnalyticsService.computeCatalogValueGrowth()` reconstrói o valor no início da janela revertendo os deltas observados em `price_history` a partir do total atual — não existe uma tabela de snapshot diário de valor de catálogo. A aproximação erra silenciosamente para ofertas adicionadas no meio da janela ou cuja única mudança de preço aconteceu antes do início observado. Documentado no próprio código (`ExchangeAnalyticsService.ts`).
- **Velocidade de reação por loja e impacto por categoria são proxies, não modelos causais**: `computeStoreReactionLag`/`computeCategoryImpact` (`src/domains/exchange/analytics/formulas.ts`) medem correlação temporal com um movimento cambial significativo, não atribuição causal isolando o efeito do câmbio de outras causas de mudança de preço. Rotulado explicitamente como "proxy"/"simplificado" no dashboard (`/admin/exchange`, aba Analytics) — nunca apresentado como certeza.
- **`StoreRateReactionFast`/`Slow` só são emitidos para lojas reivindicadas**: a emissão real depende de `merchant_stores` mapear a loja a um merchant — lojas não reivindicadas nunca geram este evento Brain, mesma limitação estrutural de todo evento real-emission desde o Release 1.7 (zero lojas reivindicadas em produção hoje, achado original do Program 0 Wave 0).
- **Bug pré-existente não corrigido, apenas nomeado**: `src/domains/connectors/crawler/shoppingchina/detail-parser.ts` tem um fallback em que um preço em Guarani é gravado diretamente no campo `price_usd`/`priceUSD` enquanto `currency` é setado como `"PYG"` — ou seja, um caso real em que `price_usd` não é de fato USD. `AutomaticCurrencyService.convert()` converte o que `offers.currency` afirma; se o dado de origem estiver incorreto, a conversão herda o erro (garbage in, garbage out). Corrigir o parser é uma mudança em `connectors/`, fora do escopo desta Wave.
- **"Número de conversões" mede chamadas à API, não conversões efetivamente exibidas ao comprador**: `exchange_conversion_log` registra cada `POST /api/exchange/convert` bem-sucedido — se um consumidor futuro (Buyer Experience) chamar a API mais vezes do que exibe ao usuário (ex.: pré-carregamento), o número superestima uso real percebido. Aceitável hoje (nenhum consumidor de UI existe ainda, Epic 10), a rever quando o primeiro consumidor real for construído.

---

## Release 1.8 — Program A — Wave 2 — Real-Time Commerce Engine (2026-07-03) — gaps documentados, não corrigidos

- **`ProductRemoved`/`OfferRemoved` não são detectados automaticamente**: `MarketChangeDetectionStage` só diffa itens que o batch de sync efetivamente tocou (`ctx.persisted`) — nunca compara o catálogo completo de uma loja antes/depois para inferir o que sumiu. Implementar isso exigiria saber que um sync de conector é exaustivo (cobre 100% do catálogo da loja naquela execução), e nenhum campo em `ConnectorMetadata`/`SyncRunOptions` expressa essa garantia hoje — conectores paginados/parciais existem. Uma heurística sem essa garantia arriscaria marcar como "removida" uma oferta que só não apareceu numa página daquele batch específico — falso positivo real, não aceitável (`ChangeType.ProductRemoved`/`OfferRemoved` estão na taxonomia e no schema de `market_changes`, prontos para o dia em que essa garantia existir).
- **`CategoryChanged`/`BrandChanged` nunca disparam pela integração real do pipeline**: `ChangeDetector` suporta os dois (compara `categorySlug`/`brandSlug` do `OfferSnapshot`), mas `ExistingOfferLookup` (`ICatalogRepository.findOfferByProductAndStore`) não carrega a categoria/marca *anterior* de uma oferta — só `priceUSD`/`inStock`/`stockQuantity`/`description`/`imageUrl`. `MarketChangeDetectionStage` por isso passa `categorySlug`/`brandSlug` como `null` nos dois lados do diff, o que nunca produz uma mudança. Corrigir exige estender `ExistingOfferLookup` e a query Supabase por trás dele — mudança em `connectors/`, fora do escopo desta Wave.
- **Breakdown de categorias/lojas do Market Pulse agrega em memória, não `GROUP BY`**: `MarketPulseService.categoryBreakdown`/`storeBreakdown`/`getTopMovers` buscam uma amostra limitada (3000 linhas de `market_changes`, `BREAKDOWN_SAMPLE_LIMIT`) e agrupam em JavaScript — mesma classe de dívida já nomeada para `CatalogMetrics.getCategoryCoverage()` no Program 0 Wave 1. Só as contagens simples (mudanças/dia, preços caindo/subindo, produtos novos/removidos) usam `COUNT` indexado exato, sem amostragem. Aceitável no volume atual; precisa virar `GROUP BY` Postgres (ou uma materialized view) perto de centenas de lojas ativas simultaneamente.
- **`avgSyncTimeMs` do Store Update Intelligence não é preenchido**: `StoreUpdateProfile.avgSyncTimeMs` existe no tipo e é aceito como parâmetro opcional de `StoreUpdateIntelligenceService.computeForStore()`, mas nenhum chamador hoje resolve o valor real — isso exigiria cruzar `connector_sync_runs` (duração `completedAt - startedAt`) por `storeSlug`, uma dependência cruzada com `connectors/` que a Wave optou por não introduzir dentro do domínio (o valor teria que ser resolvido pela camada de composição, `lib/realtime-commerce-factory.ts` ou o dashboard, e não foi). Campo fica `null` honestamente, não um número fabricado.
- **10 novos `TrustEventType` são taxonomia apenas, nenhum emitido**: `PriceDropped`, `PriceRaised`, `StockReturned`, `StockOut`, `ProductCreated`, `PromotionDetected`, `StoreHighlyResponsive`, `HighVolatilityDetected`, `LowVolatilityDetected`, `MarketTrendDetected` — toda mudança de mercado é por loja/produto, sem `merchantId` garantido (a maioria das lojas do catálogo ainda não foi reivindicada, mesmo achado estrutural do Program 0 Wave 0/Program A Wave 1). Resolver loja→merchant por evento de mudança individual (potencialmente milhares/dia) não coube no escopo desta Wave — diferente de `StoreRateReactionFast`/`Slow` (Program A Wave 1), que resolvem merchant uma vez por loja/dia via cron, não por evento.
- **`AlertType.RelevantChange` está na taxonomia, mas `BuyerAlertEngine` nunca o produz**: os 4 gatilhos concretos do brief (queda de preço, promoção, estoque voltou, produto novo) têm regra própria; "mudança relevante" ficaria sem critério objetivo sem um mecanismo de watchlist/follow do comprador (que não existe — depende do Buyer Identity Model, Program E/Wave 6) para decidir o que é "relevante" *para quem*. Implementá-lo hoje exigiria inventar um critério arbitrário, rejeitado deliberadamente.
- **`ChangeDetectionService.detectAndRecord` roda best-effort dentro do pipeline de sync, sem retry próprio**: `MarketChangeDetectionStage` captura qualquer exceção por item (`recordError`) e segue para o próximo — uma falha de escrita em `market_changes` nunca derruba o sync do catálogo em si (`CatalogWriteStage` já rodou e persistiu), mas também significa que uma mudança real pode silenciosamente não ser registrada no ledger se a escrita falhar. Aceitável para esta Wave (o ledger é um insumo de inteligência, não a fonte de verdade do catálogo), mas vale nomear: não há fila de retry para mudanças perdidas.

---

## Release 1.8 — Program A — Wave 3 — Programa de Certificação de Connectors Tier 1 (2026-07-03) — gaps documentados, não corrigidos

Esta Wave foi deliberadamente auditoria/estratégia, não implementação (mandato do CTO: "o sucesso não será medido pela quantidade de código") — ver `docs/marketplace/Tier1_Merchants.md` para o relatório completo. Itens abaixo são o que ficou nomeado, não construído.

- **Agregador de Certification Score não implementado**: `docs/marketplace/Tier1_Merchants.md` §1/§3 especifica que o Overall Certification Score deve ser um agregador read-only fino (`src/domains/connectors/certification/`, proposto) chamando `ConnectorHealthService`, `ProductHealthService`, `FreshnessService`, `MerchantPriorityService` e `realtime-commerce` — nenhum código foi escrito. Quando implementado, deve permanecer sem estado próprio (nenhuma tabela nova), só compõe os serviços já existentes.
- **Limiares numéricos de certificação (15 critérios, §2 do documento) não fixados**: nenhum dado de produção real existe ainda para os Connectors Tier 1 recém-auditados — fixar um número como "Canonical Match ≥ 60%" sem essa base seria uma decisão fabricada. Fica para a primeira Wave que rodar um Connector Tier 1 novo contra produção real.
- ~~`HttpFetchStrategy` (Connector Platform) não tem retry/backoff~~ — **resolvido na Wave 4** (2026-07-04): retry/backoff linear adicionado (2 retries, mesma política de `ExchangeRateApiHttpClient.fetchJson`), compartilhado por todo Connector sitemap-driven.
- ~~Connector de Shopping China não usa sitemap nem paginação real~~ — **resolvido na Wave 4** (2026-07-04): recertificado para usar o sitemap real (confirmado ao vivo: 27.402 URLs de produto), 3 categorias hardcoded removidas. Ver `docs/engineering/CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md`.
- **Camada de fetch headless-browser não existe**: Mobile Zone e Visão VIP têm indícios (não confirmados por spike com ferramenta de navegador real) de renderização client-side — nenhuma `IFetchStrategy` baseada em Playwright/headless existe hoje. Necessária antes de certificar qualquer Connector para essas duas lojas.
- **4 merchants Tier 1 (Cellshop, Nissei, Casa Americana, New Zone) bloqueiam crawlers de IA nomeadamente, incluindo `ClaudeBot`**: nenhuma automação de scraping foi tentada ou deve ser tentada contra eles — `Certification Status: Restricted — Commercial Partnership Recommended` no documento de merchants. Isso não é dívida técnica corrigível por engenharia — é uma decisão de negócio (buscar parceria comercial/feed oficial) que fica fora do escopo de qualquer Wave de Connector Platform.
- **Prospect Score numérico completo (Blueprint Capítulo 1, 100pts) não computado com precisão**: falta a análise de overlap de categoria entre o catálogo real do ParaguAI e o catálogo de cada loja candidata — `docs/marketplace/Tier1_Merchants.md` §6 usa uma classificação qualitativa (Alta/Média/Baixa) com raciocínio explícito em seu lugar, para não fabricar um número de pontuação sem dado real.

---

## Release 1.8 — Program A — Wave 4 — Connector Tier 1 Implementation, parcial (2026-07-04) — gaps documentados, não corrigidos

Wave pausada pelo CTO após a recertificação do Shopping China e a infraestrutura compartilhada, antes dos 3 novos Connectors — ver `docs/engineering/CONNECTOR_PLATFORM_ARCHITECTURE_REVIEW.md` para o relatório completo. Itens abaixo são achados desta etapa parcial.

- ~~`SitemapCrawler`/`textParsing.ts` não têm teste unitário próprio~~ — **resolvido na Wave 5** (2026-07-04): 28 testes novos cobrindo `SitemapCrawler` (índice, recursão, `maxDepth`, `lastmod`), `textParsing`, `DeltaImportPlanner` e `RateLimitedFetchStrategy`. `listing-parser.ts`/`detail-parser.ts` do Shopping China continuam sem teste unitário próprio (certificados só por dry-run ao vivo) — não corrigido.
- **Mobile Zone e Visão VIP confirmados client-side-rendered** (fora do código desta sessão — inspeção de `__next_f` payload/estrutura SPA): nenhuma `IFetchStrategy` baseada em headless browser (Playwright/Puppeteer) existe no projeto — nenhuma dependência nova foi adicionada. Construir um Connector real para essas 2 lojas exige essa decisão de dependência antes de qualquer código de parser.
- **Nenhuma das 3 lojas do próximo lote (Mega Eletrônicos, Roma Shopping, Atacado Connect) tem `stores` row confirmada em produção**: `CatalogWriteStage`/`ICatalogRepository.findStoreIdBySlug` nunca cria uma loja — só `DiscoveryService` tem essa autorização. Resolver isso (Discovery ou seed manual) é pré-requisito para o primeiro sync real de qualquer uma das 3, não parte da implementação do connector em si.
- **Decisão de moeda canônica por loja não é automática**: `textParsing.findFirstCurrencyAmount` prioriza USD→PYG→BRL ao escanear texto livre, mas cada connector ainda precisa decidir explicitamente que valor persistir em `offers.currency` quando o site expõe múltiplas moedas simultaneamente (Roma Shopping expõe 4).

---

## Release 1.8 — Program A — Wave 5 — Connector Platform V2 (2026-07-04) — gaps documentados, não corrigidos

Wave de industrialização da Connector Platform — auditoria completa + melhorias justificadas, sem novos merchants. Ver `docs/engineering/CONNECTOR_PLATFORM_V2.md` para o relatório completo e o raciocínio por trás de cada decisão de não construir algo.

- ~~Delta Import Engine sem persistência entre execuções reais~~ — **resolvido na Wave 6** (Program B — Wave 2, 2026-07-04): `connector_url_snapshots` (migration aplicada em produção) + `IConnectorUrlSnapshotRepository`, wired de verdade no Shopping China. Validado com execução real: 2ª sincronização pulou exatamente as 3 URLs já sincronizadas na 1ª, de 27.418 totais.
- **`ConnectorCertificationService`/`ConnectorObservabilityService` sem teste unitário próprio**: compõem serviços de 5 domínios diferentes (connectors, catalog-intelligence, marketplace-operations, realtime-commerce, exchange) — mockar todos com fidelidade exigiria um esforço de teste desproporcional nesta Wave, dado que nenhum Connector novo foi implementado para gerar dado real de validação. Mesma classe de dívida que `ExchangeDashboardService`/`RealtimeCommerceDashboardService` já têm (serviços de composição validados por uso real, não por suíte unitária).
- **"Analytics"/"Brain" nunca são avaliados na certificação** (`passed: null`): dependem de `merchant_id`, e nenhuma das 10 lojas Tier 1 tem merchant reivindicado — mesmo achado estrutural repetido desde o Program 0 Wave 0. Não é um gap desta Wave especificamente, é uma consequência honesta do estado real do funil de claim.
- **`ProductRemoved`/`OfferRemoved` (Snapshot Engine) continuam não detectados** — mesmo gap nomeado desde a Wave 2/3, não resolvido: exige saber que um sync é exaustivo, decisão por conector ainda não tomada.
- **Event-Driven não foi implementado, apenas auditado e deliberadamente adiado**: 2 consumidores estáveis (Brain, Real-Time Commerce) não justificam um barramento de eventos genérico hoje — decisão de arquitetura documentada, não uma lacuna esquecida.
- **`bootstrap.ts` continua registro manual por connector** (side-effect import) — descoberta dinâmica de diretório esbarra em uma restrição real do Next.js (imports dinâmicos por varredura de filesystem não são estaticamente analisáveis pelo bundler da Vercel). Aceitável até a escala doer de verdade.

---

## Release 1.8 — Program B — Wave 2 — Connector Platform Finalization (2026-07-04) — gaps documentados, não corrigidos

Ver `docs/engineering/CONNECTOR_PLATFORM_V2.md` §14 para o relatório completo desta Wave.

- **`ConnectorDirectoryService.listAll()` consulta `connectorRepo.findByKey()` uma vez por connector, não em lote**: aceitável com 1 connector real hoje; precisa de um método `findByKeys(ids[])` em `IConnectorRepository` antes de centenas de merchants tornarem isso um N+1 real.
- **`productsChanged`/`offersChanged` (Observability V2) usam janela fixa de 24h**, não "desde o último sync bem-sucedido" — cruzar timestamps de `connector_sync_runs` com `market_changes` por conector é complexidade não justificada para um número que é sinal, não auditoria.
- **`retryCount` continua não rastreado** — nenhum contador de retries do `HttpFetchStrategy` é persistido em lugar nenhum (mesmo gap nomeado na Wave 5).
- **`ConnectorRegistryImpl` (nome de arquivo/classe) vs. `connectorRegistry` (instância importada)**: inconsistência de nomenclatura pré-existente desde o Release 1.7, auditada e deliberadamente não corrigida nesta Wave — renomear tocaria dezenas de imports estabelecidos por um ganho puramente cosmético.

---

## Release 1.8 — Program D — Marketplace Coverage Expansion, Wave 1 (2026-07-04) — gaps documentados, não corrigidos

Mega Eletrônicos, Roma Shopping e Atacado Connect certificados com dado real (597 ofertas persistidas). Ver o relatório da Wave no chat/CHANGELOG para o detalhamento completo.

- **Jest não consegue rodar testes unitários de nenhum parser que importe `node-html-parser`** — o pacote transitivo `entities` (dependência de `node-html-parser`) passou a ser publicado como ESM puro sem condição `require`, quebrando sob o sistema de módulos CJS do Jest ("Cannot use import statement outside a module"). Achado ao tentar escrever testes reais para os parsers de Mega Eletrônicos/Roma Shopping — não introduzido por esta Wave (o próprio `detail-parser.ts` do Shopping China, em produção desde o Release 1.7, nunca teve cobertura de teste unitário pela mesma razão). `tsx` (usado pelos scripts `sync-*.ts` e por toda a validação ao vivo desta Wave) resolve o mesmo import corretamente — não é um bug de runtime real, só uma lacuna de configuração do Jest. Tentativas de corrigir via `transformIgnorePatterns`/`transform` customizado em `jest.config.ts` não funcionaram nesta sessão; revertido para não deixar configuração morta. Os parsers de Mega Eletrônicos/Roma Shopping foram validados contra HTML real ao vivo (scripts descartáveis, não testes permanentes) em vez de testes unitários — o parser de Atacado Connect (JSON-LD puro, sem `node-html-parser`) tem cobertura de teste completa.
- **Canonical Match ainda baixo nos 3 novos merchants** (1.0%/0.0%/0.5%) — esperado: Product Identity roda em Shadow Mode (não promove merge automaticamente, achado nomeado desde o Release 1.7), e os catálogos de eletrônicos/perfumes têm variantes muito específicas (cor/capacidade/edição) que dificultam match exato sem curadoria. Zero produtos canônicos compartilhados entre os 3 novos merchants entre si — o match real observado foi contra o catálogo pré-existente (Shopping China).
- **Ordem "snapshot antes de persistência" no Delta Import pode mascarar uma falha de persistência em um retry**: se `fetch()` salva o snapshot de uma URL com sucesso mas a etapa de persistência falha depois (como aconteceu uma vez com Roma Shopping por `stores` row ausente), a próxima sincronização considera essa URL "já vista" e a pula — mesmo que o produto nunca tenha sido gravado. Não é um gap introduzido por esta Wave (mesma ordem já existe em Shopping China desde a Wave 6), mas só ficou visível com uma falha de persistência real acontecendo pela primeira vez.
- **`stores` row do Atacado Connect estava seedada sob o nome pré-rebranding "Atacado Games"** — corrigido nesta Wave (slug/nome atualizados), mas é um lembrete de que dados de seed antigos podem ficar desatualizados silenciosamente até um Connector real expor a divergência.

---

## Release 1.8 — Program C — Market Intelligence Engine, Wave 1 (2026-07-04) — gaps documentados, não corrigidos

Ver `docs/engineering/MARKET_INTELLIGENCE_ENGINE.md` para o relatório completo, incluindo a auditoria que encontrou sobreposição real com quase todos os 10 objetivos do brief.

- **Cobertura de Canonical Match ainda baixa**: `PriceIntelligenceService`/`SavingsOpportunity`/rollups de volatilidade só produzem resultado interessante quando 2+ lojas vendem o mesmo produto canônico — hoje só Shopping China tem Connector certificado gerando dado real. Valor estatístico pleno depende da expansão de Connectors (Program B Wave 2 já deixou a infraestrutura pronta) ser retomada.
- **Amostra de `market_changes` ainda pequena**: `VolatilityRollupService`/`PriceHistoryQueryService` são estruturalmente corretos, mas com poucos dias de operação real de um único Connector, os números não são estatisticamente significativos ainda.
- **Nenhum `BrainAsset` novo criado**: avaliado no relatório (mapeamento para os 6 assets já existentes), mas criar um novo é decisão própria fora do escopo desta Wave, mesma disciplina de todas as Waves anteriores.
- **Sem validação end-to-end contra produção real** (diferente da Wave 4/6 do Connector Platform, que validaram Delta Import com sync real): não há Connector suficiente ainda para uma validação significativa dos rollups de categoria/merchant — validados apenas com testes unitários mockados.

---

## Release 1.8 — Program C — Wave 0 — Merchant Partnership Program (2026-07-03) — gaps documentados, não corrigidos

Wave puramente de documentação/processo (mandato do CTO: "nenhum código de scraping deverá ser criado" — interpretado, corretamente, como nenhum código de produto nesta Wave). Ver `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md` §9 para a lista completa; resumo abaixo.

- **5 formatos de integração não modelados em `ConnectorType`**: GraphQL, FTP, SFTP, Webhook e Google Sheets foram pedidos no mandato, mas `src/domains/connectors/types/enums.ts` só cobre `JsonFile`/`CsvFile`/`ApiRest`/`XmlFile`/`ManualUpload`/`Erp`. Aditivo quando o primeiro parceiro real exigir um deles — `Webhook` em particular precisa de mais que um novo valor de enum, já que é push, não pull (`IConnector.fetch()` assume um modelo de pull); precisa de uma variante ou adaptador que acumule eventos recebidos em um `ConnectorBatch`.
- **Latência do Merchant Integration Score não é computável hoje**: exigiria o parceiro reportar um timestamp de "última atualização real" por item — `RawOffer`/`RawProduct` não têm esse campo, só `ConnectorBatch.fetchedAt` a nível de lote inteiro. Sem isso, "latência" colapsaria em ser apenas o intervalo de sync, já coberto por Freshness.
- **SKU/EAN/GTIN não são campos de primeira classe em `RawProduct`**: hoje um parceiro que os forneça precisaria colocá-los em `specifications` (bag genérico `Record<string,string>`), sem tratamento especial no Canonical Match. Promovê-los a campos explícitos é a evolução natural se esses códigos se tornarem centrais para o matching de identidade de produto (Canonical Catalog, Release 1.7 Wave 4) — não feito nesta Wave.
- **Selo visual "Partner" não implementado**: `MERCHANT_PARTNERSHIP_PROGRAM.md` §6 propõe um badge distinto de `TrustBadge` existente, mas nenhum componente foi codificado — conceito documentado apenas.
- **Nenhum termo financeiro de parceria foi definido**: revenue share, taxa de integração, exclusividade — decisão de negócio específica a cada negociação real, deliberadamente não fabricada sem contexto (`MERCHANT_PARTNERSHIP_PROGRAM.md` §7/§9).
- **Nenhum contato real foi feito** com nenhum dos 10 merchants Tier 1 — `docs/business/TIER1_PARTNERS.md` está com todos os campos de contato como "Not Contacted"/"A identificar". A execução comercial (enviar e-mails, agendar reuniões) é uma ação humana fora do escopo de qualquer Wave de engenharia/documentação.

---

## Backlog (baixa prioridade — sem urgência, não bloqueante para o Release 1.8)

Consolidado no Sprint Zero (2026-07-02), reunindo o que já estava disperso pelo documento em uma única vista de "não corrigir agora, mas não esquecer":

- Todos os itens 🟢 Baixo da auditoria do Sprint Zero (arquivos vazios/mortos, timestamps cosméticos de migration).
- `getStore(id)` sem tipo de retorno explícito, código morto sem consumidor (Tipagem).
- `useOffers`/demais hooks vazios/mortos — considerar remoção em vez de preenchimento, já que os Server Components de Sprint 4.1 tornaram vários deles obsoletos por design, não por esquecimento.
- Marcador padronizado para diferenciar placeholder deliberado de esquecimento (proposta antiga, nunca implementada — `// TODO(release-x): implementar` em cada arquivo vazio de propósito).
- Adotar Prettier formalmente.
- 21 `TrustEventType` do Release 1.6 sem mapeamento no Brain.
- 5 serviços pré-Wave 4/5 com `supabase.from()` embutido em vez de repositório.
- `proxy.ts` não cobre rotas de API (mitigado, mas vale lembrar ao adicionar rotas novas).

**Não é backlog — precisa de decisão/correção antes ou durante o Release 1.8**, não deste documento adiar mais: os achados 🟠 Alto do Sprint Zero (topo desta seção — 2 páginas admin inalcançáveis, links mortos para `/merchant/catalog`), rate limiting ausente em endpoints de mutação (ADR-042 — mais urgente agora que `/api/analytics/events`/`/api/analytics/session` estão de fato recebendo tráfego real), e os 2 achados de segurança de severidade alta do Buyer Identity Model (ADR-046) — ausência de aviso de privacidade e rate limiting em `buyer_events`/`buyer_sessions`, ambos mais urgentes agora que o pipeline está confirmadamente ativo, não mais hipotético. Os dois achados 🔴 Crítico do Sprint Zero (`useAnalytics` morto, rotas `/store`/`/lojas` duplicadas) **foram resolvidos no Sprint 0.1**, e a ponte Brain ↔ `buyer_events` **foi resolvida no Program 0 Wave 0** — ver seções acima. Zero lojas reivindicadas em produção e os testes órfãos em `src/domains/trust/tests/` (achados do Wave 0, acima) são novos itens que precisam de atenção — o primeiro é um problema de funil/produto (Claim Flow, Wave 5), não de código; o segundo é dívida de higiene de testes, baixo risco, mas real.
