# CHANGELOG.md

Reconstruído a partir do histórico real de commits (`git log`) e do estado atual do código. Formato: data, commit, o que mudou de fato (verificado no diff/estado resultante, não só na mensagem).

## 2026-06-15 — `fd07de5` Primeira versão do ParaguAI

Commit inicial do repositório.

## 2026-06-20 — `70e0698` feat: initialize ParaguAI architecture

Define a estrutura de pastas oficial (`app/`, `components/`, `hooks/`, `services/`, `types/`, `lib/`, `utils/`, `database/`, `docs/`, `ai/`, `assets/`), os documentos de processo (`docs/CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/PROJECT_STATUS.md`), o `lib/supabase.ts`, e a maior parte dos placeholders vazios (services, types, hooks, utils, styles) que ainda existem hoje. Estabelece o convênio "arquivo vazio = trabalho planejado, não esquecido".

## 2026-06-21 — `1c5319a` feat(product): implementa Release 0.2 e Sprint 2.2 do domínio Produto

Primeira feature funcional ponta-a-ponta: rota `/product/[slug]` completa (`page.tsx`, `layout.tsx` com `generateMetadata`+JSON-LD, `loading.tsx`, `error.tsx`, `not-found.tsx`), componentes do domínio Produto (`ProductCard`, `ProductGallery`, `ProductHeader`, `ProductSpecifications`, `ProductOffers`, `ProductBreadcrumb`, `RelatedProducts`, `FavoriteButton`, `ShareButton`, `ProductHighlightCard`), `hooks/useProduct.ts`, `hooks/useFavorites.ts`, `services/product.service.ts`, `services/offer.service.ts` com integração real ao Supabase. Cumpre o Release 0.2 do roadmap original.

## 2026-06-21 — `33860e9` feat(home): reconstrói a Home (Sprint 3.0) e adiciona sistema de motion (Sprint 3.2)

Reescreve toda a Home com as 10 seções atuais (`Hero`, `Categories`, `Offers`, `FeaturesStores`, `AIShowcase`, `HowItWorks`, `Brands`, `Stats`, `CTASection`) usando dados de exemplo tipados com os tipos reais do domínio. Introduz o sistema de animação (`styles/animations.ts`, keyframes em `globals.css`, `Reveal`) usado de forma consistente em praticamente todo componente visual. Junto com este commit veio uma dependência nova de ícones (`lucide-react`) que **não foi declarada em `package.json`** — origem do problema corrigido no commit seguinte.

## 2026-06-22 — `9e8298e` fix: add lucide-react dependency

Adiciona `lucide-react` ao `package.json`/lockfile, que estava sendo importado por vários componentes desde o commit anterior sem estar declarado como dependência.

## 2026-06-22 — `ae432d3` fix: resolve Vercel deployment issues

Commit de correção de deploy — neste ponto, `types/store.ts` permanecia committed como arquivo vazio (0 bytes) mesmo sendo importado por 4 arquivos já commitados (`app/page.tsx`, `FeaturesStores.tsx`, `StoreCard.tsx`, `types/offer.ts`), causando `Type error: File 'types/store.ts' is not a module.` na Vercel apesar do build local funcionar (a versão real do arquivo existia apenas, não commitada, no disco local). Este commit resolve esse problema.

## 2026-06-22 — `3d3f1ff` chore: remove accidental package file

Remove um arquivo espúrio criado por um comando mal formatado no Windows (nome de arquivo contendo `:`), sem relação com código de produção.

## 2026-06-22 — `647382f` chore: trigger redeploy

Commit vazio/trivial para forçar um novo build na Vercel após as correções acima.

## 2026-06-22 — Sprint 3.2: Encerramento e Consolidação da Base de Engenharia (sem novas features)

Sprint declarada como "sem funcionalidades de negócio", focada em consolidar a base técnica:

- **`lib/env.ts`** passa a ser a única fonte de acesso a `process.env` no projeto. `lib/supabase.ts` e `constants/routes.ts` (que tinham cada um sua própria leitura de env var) agora importam `env` de lá. Mensagens de erro distinguem ambiente local (`.env.local`) de Vercel (painel do projeto), usando `process.env.VERCEL === "1"` para diferenciar. Ver ADR-001 em `docs/DECISIONS.md`.
- **`.gitignore`** corrigido: a regra `.env*` bloqueava silenciosamente `.env.example` (um template sem segredos, pensado para ser commitado). Adicionada a exceção `!.env.example`. O arquivo, que existia no lugar errado (`lib/.env.example`), foi movido para a raiz do projeto e ganhou a variável `NEXT_PUBLIC_SITE_URL` que faltava. Ver ADR-002.
- **`package.json`**: removido o script `format` (referenciava `prettier`, nunca instalado como dependência — script quebrado); `clean` reescrito de sintaxe `cmd.exe` (Windows-only) para um one-liner Node multiplataforma. Scripts `dev`/`build`/`start`/`lint`/`typecheck`/`check` confirmados presentes e funcionais. Ver ADR-003 e ADR-004.
- **Documentação**: criados `docs/DECISIONS.md`, `docs/CONVENTIONS.md`, `docs/API_CONTRACTS.md`, `docs/DOMAIN_MODEL.md`, `docs/COMPONENT_INDEX.md`, `docs/DEPENDENCY_GRAPH.md`. Atualizados `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/TECH_DEBT.md`, `docs/NEXT_STEPS.md` para refletir as mudanças acima.
- Validado: `npm run lint` (0 erros), `npm run typecheck` (0 erros), `npm run build` (sucesso) — incluindo um teste manual de remover/restaurar `.env.local` para confirmar a nova mensagem de erro.

Nenhuma rota, componente, hook ou comportamento visível ao usuário foi alterado nesta sprint.

## 2026-06-22 — Sprint 3.3: Domínio de Busca (Release 0.4, parte 1)

Liga a busca de ponta a ponta, encerrando seu estado decorativo:

- **`app/search/page.tsx`** passa a ler `searchParams.q` (Server Component) e ganha `generateMetadata` (título/descrição dinâmicos, canonical, Open Graph/Twitter, `robots: noindex` para resultados com query — conteúdo fino/duplicado — e indexável sem query).
- **`hooks/useSearch.ts`** implementado: estado do campo de busca + navegação via `searchPath()`, mantendo a URL (`?q=`) como fonte de verdade. Consumido por `components/home/SearchBar.tsx`, que agora aceita `defaultValue` (preenchido a partir da query atual).
- **`services/search.service.ts`** (`searchEverything`) reescrito: agora também busca `categories` (além de `products`/`stores`/`brands`), escapa `%`/`_` do termo do usuário antes do `ilike` (evita que o usuário injete wildcards do Postgres), limita 8 resultados por seção, e só lança erro se todas as queries falharem (erro parcial é logado, não interrompe a resposta). Tipo de retorno `SearchResponse` (`types/search.ts`, antes vazio).
- **`components/search/SearchResults.tsx`** renderiza resultados reais agrupados por seção (produtos/lojas/categorias/marcas), com contagem total e tempo de busca; estado vazio (sem query ou zero resultados) via `components/ui/EmptyState.tsx` (novo, antes vazio, reaproveitável em outras telas).
- **`app/search/loading.tsx`** e **`app/search/error.tsx`** adicionados, espelhando `app/product/[slug]/`. `error.tsx` usa a prop `unstable_retry` (API do Next 16.2, confirmada em `node_modules/next/dist/docs`) e distingue erro genérico de estado offline via `navigator.onLine`. `components/search/SearchResultsSkeleton.tsx` (novo) serve de fallback para `<Suspense>` na página e para `loading.tsx`.
- **`app/layout.tsx`** (root): metadata customizada substitui o padrão do `create-next-app`; adicionado JSON-LD `WebSite`/`SearchAction` apontando para `searchUrl()`, habilitando potencial "sitelinks search box" do Google.
- **`constants/routes.ts`**: `searchPath()`/`searchUrl()` adicionados, no mesmo padrão de `productPath()`/`productUrl()`.

Não inclui: filtros, paginação, autocomplete (ficam para uma fase 2 do Release 0.4); preço nos produtos da busca (a query não faz join com `offers`); rota `/categories/[slug]` (os links de categoria continuam apontando para uma rota inexistente, mesmo padrão que `/store/[slug]` tinha antes do domínio de Loja).

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes de `<img>`), `npx tsc --noEmit` (0 erros) e `npm run build` (sucesso — `/search` passou de estático para dinâmico, por depender de `searchParams`).

## 2026-06-22 — Sprint 3.4: Domínio de Loja (Release 0.3)

Fecha o terceiro domínio central da Home, replicando deliberadamente a arquitetura do Domínio de Produto:

- **`services/store.service.ts`**: `getStoreBySlug(slug)` e `getRelatedStores(excludeStoreId, limit)` adicionados; `getStore(id)`/`getStores()` mantidos sem alteração (o primeiro continua sem consumidor).
- **`services/offer.service.ts`**: `getOffersByStore(storeId)` adicionado, retornando `OfferWithProduct[]` (novo tipo em `types/offer.ts`) — join `offers` + `products`, ordenado por preço.
- **`hooks/useStore.ts`** implementado: espelha `useProduct.ts` (loading/notFound/dados), busca loja + ofertas da loja + lojas relacionadas.
- **`components/store/StoreDetails.tsx`** (header/perfil: rating, badge de verificada, cidade/país, descrição), **`StoreOffers.tsx`** (lista de ofertas da loja, cada linha já linka para o produto — une "produtos da loja" e "ofertas" pedidos na missão da sprint em um único componente, para não duplicar lógica/template) e **`StoreGrid.tsx`** (outras lojas, espelha `RelatedProducts.tsx`) saem do estado de placeholder vazio.
- **`app/store/[slug]/`**: `layout.tsx` (`generateMetadata` com canonical/OG/Twitter + JSON-LD `LocalBusiness`), `page.tsx` (Client, `useParams` + `useStore`, mesmo padrão atípico de `/product/[slug]/page.tsx` documentado em `ARCHITECTURE.md`), `loading.tsx`, `error.tsx` (`unstable_retry`), `not-found.tsx` — todos novos.
- **`constants/routes.ts`**: `storePath()`/`storeUrl()` adicionados; `StoreCard.tsx` migrado de string literal (`` `/store/${store.slug}` ``) para `storePath()`.
- **Seção de avaliações**: `EmptyState` ("Avaliações em breve") sem nenhum dado mocado — `types/review.ts` e a tabela `reviews` ainda não existem.

**Não implementado nesta sprint, por decisão explícita do CTO**: contato (telefone/WhatsApp/e-mail) e horário de funcionamento. Essas colunas não existem em `types/store.ts` nem na tabela `stores` real (confirmado consultando o Supabase diretamente). Em vez de adicionar campos especulativos ao tipo ou usar mocks, foi gerada uma **proposta** de migration em `database/migrations/0001_proposed_store_contact_hours.sql` (`phone`, `whatsapp`, `email`, `website_url`, `address`, `business_hours jsonb`, todas nullable) — **não aplicada ao banco**, aguardando avaliação. Ver `docs/DECISIONS.md`, ADR-006.

**Achado de dados (não é um bug desta sprint)**: testando a página `/store/[slug]` manualmente contra o Supabase real, descobriu-se que as 5 lojas cadastradas (Cellshop, Nissei, Shopping China, Mega Eletrônicos, Atacado Games) têm `slug: null`, e a tabela `products` está vazia (0 linhas). O código está correto — `getStoreBySlug`/`getProductBySlug` retornam `null` corretamente para um slug que não existe em nenhuma linha — mas isso significa que nenhuma página de loja ou produto é navegável com dados reais até que alguém popule esses campos no painel do Supabase. Ver `docs/DECISIONS.md`, ADR-007.

Validado com `npm run lint` (0 erros, 6 warnings — 5 pré-existentes + 1 novo de `<img>` no banner de `/store/[slug]`), `npx tsc --noEmit` (0 erros, após `npm run clean` para descartar tipos de rota desatualizados em `.next/`) e `npm run build` (sucesso — `/store/[slug]` nova rota dinâmica).

## 2026-06-22 — Sprint 3.4.1: Consolidação da Camada de Dados (auditoria, sem código de produção alterado)

Sprint de diagnóstico puro, a pedido explícito do CTO ("não implemente novas funcionalidades de interface"). Auditou `stores`/`products`/`offers`/`brands`/`categories` consultando o Supabase diretamente (`select("*")` para tabelas com dados; teste coluna-por-coluna lendo o erro "column does not exist" do PostgREST para tabelas vazias — método somente-leitura, sem chave de serviço).

**Achados**:
- `types/offer.ts` diverge do schema real: `price`/`stock`/`installments`/`url` não existem (o banco usa `price_usd`+`price_brl`, `in_stock`/`available`/`stock_quantity`, e `product_url`). Bug latente confirmado: assim que houver uma oferta real, `ProductOffers.tsx`/`StoreOffers.tsx` exibiriam preço `NaN` e nunca o botão "Ver oferta".
- `types/store.ts` diverge do schema real: `banner_url`/`verified` não existem (o banco usa `cover_image`/`is_verified`). Bug latente confirmado: banner e badge "Verificada" nunca aparecem.
- A conclusão da Sprint 3.4 (ADR-006) de que contato/horário "não existiam no schema" estava **errada** — essas colunas (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`) já existem; a investigação só checou os campos que o tipo já declarava, sem `select("*")` real.
- 4 relacionamentos (FKs) confirmados reais e funcionando (`offers→stores`, `offers→products`, `products→brands`, `products→categories`).
- Nenhuma das 14 tabelas "futuras" de `database/DATABASE.md` existe ainda (`reviews` incluída) — documentação correta nesse ponto.
- Duas tabelas reais não documentadas descobertas: `profiles` (possível scaffold de Supabase Auth) e `favorites` (paralela e desconectada do `localStorage` usado por `useFavorites.ts`).

**Ações**: `database/migrations/0001_proposed_store_contact_hours.sql` marcado como **superado**; `database/migrations/0002_revised_store_data_layer.sql` criado em seu lugar, propondo apenas `UNIQUE (slug)` — nenhuma coluna nova é necessária. `docs/DOMAIN_MODEL.md` reescrito com o schema real lado a lado com cada tipo TypeScript. `docs/DECISIONS.md` ganhou ADR-008 (achado completo) e ADR-006 foi marcado como tendo a premissa corrigida. Nenhuma migration foi aplicada, nenhum dado foi inserido, nenhum arquivo de código de produção (`types/`, `services/`, `components/`) foi alterado — correção fica para a Sprint 3.5, pendente de aprovação.

## 2026-06-23 — Sprint 3.5: Catálogo Premium de Produtos (Release 0.2, parte 2)

Duas frentes, na ordem decidida com o CTO antes de iniciar (corrigir dados primeiro, para não construir o catálogo sobre bugs já confirmados):

**1. Correção do modelo de dados (ADR-009)**:
- **`types/offer.ts`**: `price`/`currency` → `price_usd` + `price_brl` (valores independentes); `stock` → `in_stock` (fonte da UI) + `available`/`stock_quantity` (modelados, sem consumidor); `url` → `product_url`; `installments` removido; `old_price`/`condition` adicionados.
- **`types/store.ts`**: `banner_url` → `cover_image`; `verified` → `is_verified`; adicionados os 13 campos reais que faltavam (`phone`, `whatsapp`, `email`, `website`, `address`, `opening_hours`, `instagram`, `latitude`, `longitude`, `delivery`, `pickup`, `pix_br`, `active`).
- **`utils/currency.ts`**: `convertToUSD`/`convertToBRL` removidos (sem consumidor — o banco já entrega os dois preços prontos).
- **`services/offer.service.ts`**: `.order("price", ...)` → `.order("price_usd", ...)`.
- **`ProductOffers.tsx`/`StoreOffers.tsx`/`StoreCard.tsx`/`app/store/[slug]/{page,layout}.tsx`/`app/product/[slug]/layout.tsx`/`app/page.tsx`**: atualizados para os nomes reais.
- **`StoreDetails.tsx`**: ganhou a seção de Contato/Horário (telefone, WhatsApp, e-mail, site, endereço, horário), antes bloqueada pela premissa incorreta do ADR-006.

**2. Catálogo de produtos (`/products`)**:
- **`services/category.service.ts`/`brand.service.ts`** (antes vazios): `getCategories`/`getCategoryBySlug`, `getBrands`/`getBrandBySlug`.
- **`services/product.service.ts`**: `getProductsCatalog` novo — filtros de categoria/marca/busca (nativos) e loja/disponibilidade/faixa de preço (via embedding PostgREST `offers!inner`/`offers!left`), paginação real (`.range()` + `count: "exact"`), ordenação "mais recentes" nativa e "menor/maior preço" corrigida em memória por página (limitação documentada, ADR-011) — "mais vendidos"/"melhor avaliação" como estrutura preparada.
- **`utils/search.ts`** (antes vazio): `escapeLikePattern` extraído de `search.service.ts` para ser compartilhado com o catálogo.
- **`types/product.ts`**: `ProductCatalogItem` novo.
- **`components/product/ProductGrid.tsx`** (antes vazio): grid + `EmptyState`. **`ProductGridSkeleton.tsx`**/**`ProductFilters.tsx`** novos. **`hooks/useProductFilters.ts`** novo — mantém a URL como fonte de verdade dos filtros (mesmo princípio de `useSearch.ts`).
- **`components/ui/Breadcrumb.tsx`** (novo, com JSON-LD `BreadcrumbList`) substitui `ProductBreadcrumb.tsx` (removido) e a trilha inline duplicada em `app/store/[slug]/page.tsx`. **`components/ui/Pagination.tsx`** (novo, SSR via `<Link>`). **`components/ui/Input.tsx`**/**`Select.tsx`** (Input antes vazio; Select novo) — usados por `ProductFilters`.
- **`components/product/ProductCard.tsx`**: unificado com `ProductHighlightCard.tsx` (removido) — ver ADR-010. Props achatadas (`slug`, `name`, `imageUrl`, `priceUSD?`, `originalPriceUSD?`, `subtitle?`, `inStock?`); `RelatedProducts`, `SearchResults` e `home/Offers.tsx` migrados para o novo formato.
- **`constants/routes.ts`**: `productsPath()`/`productsUrl()` novos, com ordem fixa de parâmetros para canonical estável.
- **`app/products/{page,loading,error}.tsx`** novos: `generateMetadata` (canonical/OG/Twitter, `robots: noindex,follow` para combinações filtradas/paginadas — mesmo padrão de `/search`), JSON-LD `CollectionPage`+`ItemList`, `<Suspense>` em torno da listagem (filtros fora do Suspense).

**Arquivos removidos** (aprovação explícita do CTO antes de cada remoção, por restrição do `CLAUDE.md`): `components/product/ProductHighlightCard.tsx`, `components/product/ProductBreadcrumb.tsx`.

**Proposta de migration (não aplicada)**: `database/migrations/0003_proposed_product_catalog_price_view.sql` — materialized view de agregação de preço por produto, para eliminar a limitação de ordenação "best effort" quando o volume de dados justificar.

**Não incluído nesta sprint**: seed de dados real (`stores.slug`, `products`/`offers`) — continua exigindo aprovação separada para alterar produção (ADR-007, ainda sem solução); aplicação da migration de agregação de preço.

Validado com `npm run lint`, `npx tsc --noEmit` e `npm run build` — ver relatório da sprint para o resultado.
