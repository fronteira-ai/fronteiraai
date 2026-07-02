# TECH_DEBT.md

Itens identificados por leitura completa do código. Nenhum é bloqueante hoje (build/lint/TS passam), mas todos custam mais quanto mais tarde forem corrigidos.

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

## Wave 6 — Platform Hardening (2026-07-02) — achados não corrigidos nesta Wave

- **Sem rate limiting em nenhum endpoint de mutação** — confirmado por auditoria: `/api/merchant/claims`, `/api/merchant/delegates`, `/api/merchant/upgrade-interest` e todo o restante da API dependem só de autenticação de sessão (a única exceção parcial é `/api/analytics/events`, que tem lógica de batching mas não rate limiting real). Severidade baixa hoje (exige sessão autenticada válida, não é anônimo), mas construir a infraestrutura (Redis/Upstash ou equivalente) é uma capacidade nova, fora do mandato "sem features" da Wave 6 — ver ADR-042 parte 3. Candidato ao Release 1.8 se o volume de merchants justificar.
- **`proxy.ts` (ex-`middleware.ts`) não cobre `/api/admin/**` nem `/api/merchant/**`** — o `matcher` só redireciona `/admin/:path*` e `/merchant/:path*` (páginas). Seguro hoje porque toda rota de API já se autoguarda individualmente (`requireAdmin()`/`requireMerchant()`/`requireMerchantContext()`, confirmado 100% de cobertura na auditoria da Wave 6), mas é uma dependência implícita: qualquer rota de API nova precisa lembrar de chamar seu próprio guard — o proxy não pega o esquecimento. Next.js recomenda explicitamente não confiar só no proxy para isso; nenhuma mudança de código proposta, só o registro do risco para quem adicionar rotas novas.
- **`connector_configs` (migration `0010`) e `import_logs` (Release 0.9) continuam marcadas "superadas", não removidas** — `connector_configs` já não tem nenhum call site (confirmado por grep, zero referências); `import_logs` teve suas 4 leituras remanescentes (`app/admin/page.tsx`, `app/api/admin/dashboard/stats/route.ts`, `CatalogIntelligenceService.ts`, `ExecutiveSummaryService.ts` — todas congeladas desde a Wave 2, quando as escritas pararam) migradas para `connector_sync_runs` durante a Wave 6. Nenhuma das duas tabelas foi removida do banco — decisão deliberada, mesmo padrão de `0022`-`0024`/`connector_configs`: dropar uma tabela em produção exige uma migration de rollback nomeada e o aval do CTO, não é feito silenciosamente por uma sessão de hardening.
- **5 serviços (pré-Wave 4/5) embutem `supabase.from(...)` direto em vez de passar por um repositório** — `catalog-intelligence/services/ProductHealthService.ts`, `growth-engine/services/GrowthContextBuilder.ts`, `merchant-decision/services/DecisionContextBuilder.ts`, `merchant-intelligence/services/{CatalogIntelligenceService.ts, ExecutiveSummaryService.ts}`. Padrão do Release 1.6, anterior à convenção repository-first que `connectors/`/`product-identity/`/`canonical-catalog/`/`merchant-ownership/`/`trust/` seguem à risca. `GrowthContextBuilder`/`DecisionContextBuilder` também reimplementam a própria wiring de `MerchantAnalyticsService` em vez de reaproveitar `lib/analytics-factory.ts`. Nenhum bug de comportamento — só uma inconsistência de padrão (DRY), fora do escopo de correção da Wave 6 (nenhuma regra de negócio muda), candidata a uma sprint de manutenção futura.

## Sprint Zero — Auditoria Organizacional Completa (2026-07-02)

Auditoria de higiene de código conduzida antes do início do Release 1.8 (mandato do CTO: "preparar o ambiente sem gerar dívida técnica"). Cobre `components/`, `hooks/`, `lib/`, `utils/`, `types/`, `constants/`, `scripts/`, `database/`, `supabase/`, `app/`. Nenhum item abaixo foi corrigido — apenas registrado e classificado, conforme instrução explícita do CTO ("se forem encontradas dívidas técnicas relevantes, NÃO corrigi-las").

### 🔴 Crítico

- **`hooks/useAnalytics.ts` nunca é importado em nenhum lugar do repositório** (verificado por grep, não apenas pela auditoria — confirmado independentemente). É o hook que dispara eventos de comportamento no cliente (`buyer_events`/`buyer_sessions`, Release 1.6 — Merchant Analytics Platform). Se nenhum componente o chama, é plausível que **nenhum evento real de comprador esteja sendo gerado em produção hoje**, apesar de todo o backend (schema, RLS, serviços, APIs) estar construído e "confirmado funcionando" desde o Release 1.6. Isso é relevante além de si mesmo: o Buyer Identity Model (ADR-045/046) assume que `buyer_events` já acumula comportamento real desde 2026-06-30 para justificar a maturação de `C-6 Buyer Behavioral Knowledge` — se este achado se confirmar, essa suposição precisa ser revisitada antes da Wave 6 do Release 1.8. **Ação recomendada, não executada aqui**: verificar se algum componente client-side de fato invoca `useAnalytics` (talvez via um Provider não capturado pelo grep) antes de assumir que os dados de `buyer_events` existentes (se houver) são reais.

- **`/store/[slug]` e `/lojas/[slug]` são rotas duplicadas para a mesma entidade, ambas indexadas simultaneamente em `app/sitemap.ts`** (`case "stores"` e `case "lojas"`, achado confirmado por leitura direta do sitemap). `/store/[slug]` é a implementação mais antiga e mais fina (`services/store.service.ts`, sem `generateMetadata`/JSON-LD na própria página, alcançada via `StoreCard`/`storePath()` na Home e busca); `/lojas/[slug]` é a implementação mais nova e completa (`services/stores-public.service.ts`, `generateMetadata`/JSON-LD/breadcrumbs/Merchant Score, alcançada via Navbar/Footer). Duas páginas para o mesmo dado, indexáveis simultaneamente, é exatamente o tipo de conteúdo duplicado que motores de busca penalizam — relevante e urgente dado que `RELEASE_1_8_BLUEPRINT.md` Capítulo 7 (SEO Expansion) planeja expandir cobertura de página assumindo uma arquitetura de rotas limpa. **Não corrigido aqui** — decisão de qual rota é a canônica (provavelmente `/lojas/[slug]`, mais completa) e como redirecionar/descontinuar a outra é uma decisão de produto, não apenas técnica.

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

**Não é backlog — precisa de decisão/correção antes ou durante o Release 1.8**, não deste documento adiar mais: os achados 🔴 Crítico e 🟠 Alto do Sprint Zero (topo desta seção), rate limiting ausente em endpoints de mutação (ADR-042), e os 2 achados de segurança de severidade alta do Buyer Identity Model (ADR-046) — ausência de aviso de privacidade e rate limiting em `buyer_events`/`buyer_sessions`.
