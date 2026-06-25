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

## 2026-06-23 — Sprint 3.6: Data Foundation (auditoria, sem código de produção alterado)

Sprint de diagnóstico puro, a pedido explícito do CTO, consolidando o entendimento da camada de dados antes de implementar o Comparador de Produtos. Divergência registrada em relação à proposta anterior de `docs/NEXT_STEPS.md` (que bundlava seed + início do Comparador numa só "Sprint 3.6"): o CTO redefiniu o escopo desta sprint para ser só auditoria, deixando seed e Comparador para a sprint seguinte — mesmo padrão já visto nas Sprints 3.3 e 3.5 (missão recebida divergindo do `NEXT_STEPS.md`, decisão do CTO prevalece, divergência documentada).

- **Banco**: relacionamentos `products↔brands/categories` e `offers↔products/stores` reconfirmados via PostgREST sem erro. Auditoria de índices/constraints reais não foi possível com a chave anônima — registrada como limitação, não inferida.
- **Dados**: consulta ao vivo ao Supabase confirma `products: 0`, `offers: 0`, `brands: 0`, `categories: 0`, `stores: 5` (todas com `slug`/`active`/`cover_image` nulos). Achado novo: `website` e `opening_hours` já estão preenchidos nas 5 lojas reais; `address` em 4/5; `whatsapp` é string vazia (não nula) em 1 loja.
- **Services**: `product`/`offer`/`store`/`search`/`category`/`brand` revisados linha a linha contra o schema real — nenhuma divergência nova, nenhuma correção necessária.
- **Migrations**: `0001` confirmada superada; `0002` fase 1 (`UNIQUE (slug)`) avaliada como segura para aplicar a qualquer momento; `0003` (view de agregação de preço) avaliada como prematura sem dados reais.
- **Seed**: proposta de estratégia entregue (arquivos, ordem de carga, critérios de qualidade, plano de atualização futura) — nenhum insert executado, conforme instrução explícita.

Nenhum arquivo de código (`types/`, `services/`, `components/`) foi alterado nesta sprint — só documentação. Nenhuma migration aplicada, nenhum dado inserido.

## 2026-06-23 — Sprint 3.7: Data Foundation v2 (Release 0.5, fundação)

Transforma o plano de seed da Sprint 3.6 em código real, propõe constraints/índices/views para escala e documenta (sem implementar) a arquitetura de Price Engine e Offer Ranking — nenhum dado real inserido, nenhuma migration aplicada, nenhuma feature de interface.

- **`database/seed/`** (novo): estrutura modular `brands/`, `categories/`, `stores/`, `products/`, `offers/`, `lib/client.js`, `index.js`, `validate.js`, `README.md` — ver ADR-012 para a decisão de ser JavaScript puro (CommonJS), fora da árvore TypeScript da aplicação, sem dependência nova (`ts-node`/`tsx` não instalados).
  - `index.js`: orquestrador idempotente (resolve cada entidade por chave natural antes de inserir), **dry-run por padrão** — só escreve com `node database/seed/index.js --execute`. Backfill de `stores.slug`/`active` nas 5 lojas reais (nunca cria loja nova); 5 marcas, 5 categorias, 6 produtos e 9 ofertas de exemplo (deliberadamente incluindo 1 produto sem nenhuma oferta e 1 oferta `in_stock=false`, para validar os estados vazios já implementados na UI).
  - `validate.js`: auditoria de qualidade de dados somente leitura (slugs duplicados, produtos sem categoria/marca, ofertas sem loja/produto, preços inválidos) — executada nesta sprint contra o banco real: nenhum problema encontrado (tabelas vazias), achado já conhecido reconfirmado (5/5 lojas sem slug).
  - `package.json`: scripts novos `db:seed`, `db:seed:execute`, `db:validate`.
  - `eslint.config.mjs`: `database/seed/**` adicionado a `globalIgnores` (CommonJS fora do escopo das regras de import de `eslint-config-next/typescript`).
- **`database/migrations/0004_proposed_catalog_integrity_and_indexes.sql`** (novo, não aplicada): `UNIQUE (slug)` em `products`/`brands`/`categories`; índices em `offers.product_id`/`offers.store_id`/`offers.price_usd`/`products.brand_id`/`products.category_id`.
- **`database/migrations/0005_proposed_store_ranking_view.sql`** (novo, não aplicada): `store_ranking_summary` (rating, contagem de ofertas, proporção em estoque, última atualização) — insumo do Offer Ranking. As métricas por produto (menor/maior preço, contagem de ofertas) já são cobertas por `0003` (Sprint 3.5) — não duplicadas.
- **`docs/DECISIONS.md`**: ADR-012 (seed em JS puro), ADR-013 (arquitetura do Price Engine, futura), ADR-014 (algoritmo de Offer Ranking v1, futuro), ADR-015 (consolidação das views de apoio) — todas documentam direção arquitetural, nenhuma implementada em código/schema.
- **Services**: `product`/`offer`/`store`/`search` revisados de novo — nenhuma divergência nova, nenhuma correção necessária.

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes — `database/seed/**` excluído do lint por ser tooling fora da árvore TypeScript), `npx tsc --noEmit` (0 erros) e `npm run build` (sucesso, mesmas 6 rotas, sem regressão).

**Não incluído, por instrução explícita/Restrição Absoluta**: nenhum `node database/seed/index.js --execute` foi rodado contra o Supabase real; nenhuma migration (`0002`, `0004`, `0005`) foi aplicada.

## 2026-06-24 — Sprint 3.8: Seed Execution & Catalog Validation

Primeira escrita real de dados em produção do projeto, com aprovação explícita do CTO. Nenhum código de aplicação alterado — só execução de tooling já existente (`database/seed/`, Sprint 3.7) e documentação.

- **Tentativa 1 (chave anônima)**: `npm run db:seed:execute` rodou sem travar, mas todo `INSERT` em `brands`/`categories`/`products` falhou com `new row violates row-level security policy`; o `UPDATE` de `stores.slug`/`active` foi filtrado silenciosamente pela RLS (0 linhas afetadas) e o script logou `[OK]` por engano — confirmado por snapshot antes/depois que nenhuma escrita real ocorreu. Parado para investigação, conforme regra da missão.
- **Resolução**: CTO adicionou `SUPABASE_SERVICE_ROLE_KEY` a `.env.local`. Ver ADR-016.
- **Tentativa 2 (chave de serviço)**: dry-run reconfirmado, depois `--execute` com sucesso total — `stores` (5/5 backfill), `brands` (5), `categories` (5), `products` (6), `offers` (9). Reexecução confirmou idempotência (tudo `[SKIP]`, sem duplicata).
- **Auditoria**: `npm run db:validate` (0 problemas) + auditoria extra com anti-join real via chave de serviço (0 FKs órfãs, 0 slugs duplicados, 0 pares `product_id+store_id` duplicados, 0 produtos inativos). Nenhuma correção de dados necessária.
- **`docs/DECISIONS.md`**: ADR-016 (achado da RLS/chave de serviço + bug de log falso-positivo em `index.js`, não corrigido nesta sprint — fora do escopo "nenhuma funcionalidade nova").
- **`docs/PROJECT_STATUS.md`/`docs/NEXT_STEPS.md`/`docs/TECH_DEBT.md`**: atualizados para refletir ADR-007 resolvido e o novo achado.

**Não incluído, por instrução explícita**: nenhuma migration (`0004`, `0005`) aplicada; nenhuma alteração de RLS policy; nenhuma feature de interface (Comparação de Produtos fica para a Sprint 3.9); o bug de log falso-positivo em `index.js` foi documentado, não corrigido (não era necessário para concluir a carga de dados).

## 2026-06-24 — Sprint 3.9: Price Engine v1 + Compare Foundation

Implementa em código (não só arquitetura) o Price Engine proposto na Sprint 3.7 (ADR-013), e corrige o bug de log identificado na Sprint 3.8 (ADR-016). Sem UI/páginas novas, sem autenticação, sem scraping/IA, por escopo explícito da missão.

- **`database/migrations/0006_proposed_price_history.sql`** (novo): tabela `price_history` (`offer_id` FK para `offers`, `price_usd`, `price_brl`, `old_price_usd`, `source`, `recorded_at`) + índice composto `(offer_id, recorded_at DESC)`.
- **`types/priceHistory.ts`** (novo): `PriceHistoryEntry`, `PriceChangeSource`, `OfferPriceMetrics`, `PriceUpdateResult`.
- **`services/offer.service.ts`**: `updateOfferPrice()` — único caminho de escrita de preço permitido a partir de agora; grava `price_history` antes de atualizar `offers`, é no-op se o preço não mudou, e confirma linhas afetadas no `update` final (mesmo padrão do ADR-016). `getOfferPriceMetrics()` — menor/maior preço histórico, variação percentual, última mudança; degrada graciosamente (preço atual real, histórico `null`) quando `price_history` não existe.
- **`database/seed/index.js`**: corrigido o backfill de `stores` — agora usa `.select("id")` no `UPDATE` e loga `[AVISO]` (não `[OK]`) quando a RLS filtra a escrita silenciosamente.
- **Testes funcionais ao vivo** (somente leitura/degradação controlada, sem dado real alterado): `getOfferPriceMetrics`/tentativa de `insert` em `price_history` contra o Supabase real, confirmando degradação graciosa; reprodução do cenário do bug do ADR-016 com a chave anônima, confirmando que a correção detecta corretamente a escrita silenciosamente bloqueada.
- **`docs/DECISIONS.md`**: ADR-017 (schema do Price Engine, caminho único de escrita, bloqueio de DDL).
- **`docs/DOMAIN_MODEL.md`/`docs/API_CONTRACTS.md`/`docs/TECH_DEBT.md`**: atualizados com o novo schema/serviço/limitações.

**Bloqueio real**: `database/migrations/0006` não foi aplicada — nenhuma ferramenta deste projeto executa DDL contra o Supabase (sem `pg`/`DATABASE_URL`, sem CLI, sem RPC de SQL exposta, confirmado por introspecção do OpenAPI do PostgREST). Diferente de `0002`/`0004`/`0005` (propostas por decisão pendente), esta ficou proposta por impossibilidade técnica — corresponde a uma das condições de parada explícitas da missão ("necessidade de credencial inexistente").

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso, mesmas 6 rotas), `npm run db:validate` (0 problemas) e reexecução de `npm run db:seed:execute` (idempotência confirmada).

**Não incluído, por instrução explícita**: nenhuma tela `/compare`; nenhuma migration aplicada; nenhuma alteração de RLS; nenhuma autenticação/scraping/IA.

## 2026-06-24 — Sprint 3.9, adendo: Price Engine validado contra dados reais + achado crítico de RLS de leitura

O CTO aplicou `0006_proposed_price_history.sql` manualmente no SQL Editor do Supabase. Validação completa do Price Engine contra a tabela real, mais um achado crítico não relacionado a preço.

- **Bug de cálculo encontrado e corrigido** em `getOfferPriceMetrics` (`services/offer.service.ts`): `highestPriceUSD`/`priceChangePercent` ignoravam o preço original (só disponível em `old_price_usd` da primeira entrada de histórico) — se o preço só tivesse caído desde o início do histórico, o pico original nunca apareceria no cálculo. Corrigido para incluir `firstEntry.old_price_usd` no conjunto de preços e como base do cálculo de variação percentual.
- **Validação funcional completa** (chave de serviço, oferta real `iphone-16-pro-256gb-titanio-preto@cellshop`): 27 asserções — leitura de histórico, métricas baseline, duas mudanças reais de preço (999→949→1050), detecção de no-op, restauração ao preço original preservando 3 entradas reais de histórico, métricas finais corretas. Todas passaram.
- **Confirmado**: a chave anônima (a que a aplicação usa) não escreve em `price_history` (erro explícito de RLS) nem em `offers` (bloqueio silencioso) — consistente com o padrão do ADR-016.
- **Achado crítico (ADR-019), não corrigido**: testando a leitura da chave anônima, confirmou-se que ela **também não vê nenhuma linha** de `price_history`, nem de `brands`/`categories`/`products`/`offers` — só `stores` tem leitura pública funcionando. Isso passou despercebido em todas as auditorias da Sprint 3.8 porque elas usam `database/seed/lib/client.js`, que prefere a chave de serviço (presente desde a Sprint 3.8) — nunca a chave anônima que a aplicação real usa. Por dedução direta do código (`lib/supabase.ts` usa só a chave anônima, em qualquer ambiente), o catálogo real provavelmente está vazio para usuários reais agora. Correção proposta: `database/migrations/0007_proposed_public_read_policies.sql` (policies de `SELECT` público, sem alterar nenhuma policy de escrita).
- **`docs/DECISIONS.md`**: ADR-018 (validação do Price Engine, bug corrigido, classificação "Backend Production Ready") e ADR-019 (achado crítico de leitura pública).
- **`database/migrations/0006_proposed_price_history.sql`**: cabeçalho atualizado para refletir que foi aplicada manualmente em produção (arquivo não renomeado, por convenção de histórico).

Revalidado: `npm run lint`/`npx tsc --noEmit`/`npm run build` (sem regressão), `npm run db:validate` (0 problemas).

**Classificação final do Price Engine v1**: "Backend Production Ready" — não "Production Ready" de ponta a ponta, porque a leitura pública está bloqueada pelo achado do ADR-019 (mais amplo que só preço) e nenhum caminho de escrita real (Admin/Crawler) existe ainda.

## 2026-06-25 — Sprint 4.2: MVP Público (Release 0.7)

Lapidar a experiência existente para o primeiro lançamento público. Nenhuma funcionalidade nova — só qualidade, SEO, navegação e performance.

**`<img>` → `next/image` (0 warnings — era 5)**:
- `next.config.ts`: `images.remotePatterns` configurado (Supabase Storage + HTTPS genérico para MVP).
- `components/product/ProductCard.tsx`: `<img fill sizes>` com `relative` no container.
- `components/product/ProductGallery.tsx`: imagem principal com `priority` (LCP); thumbnails com `fill sizes="80px"`.
- `components/store/StoreCard.tsx`: cover image com `fill sizes`.
- `app/store/[slug]/page.tsx`: hero da loja com `fill priority sizes="100vw"`.

**Navegação — links mortos eliminados**:
- `components/layout/Navbar.tsx`: removidos `/stores` e `/compare` (rotas inexistentes). Novo menu: Início, Produtos, Buscar, IA.
- `components/layout/Footer.tsx`: links para páginas inexistentes convertidos em `<span>` com badge "em breve". Apenas links reais continuam clicáveis.

**SEO**:
- `app/sitemap.ts` (novo): sitemap dinâmico com rotas estáticas + todas as páginas de produto, compare e loja buscadas do Supabase. Exposto como `/sitemap.xml`.
- `app/robots.ts` (novo): robots.txt com `Allow: /`, `Disallow: /api/ /_next/` e ponteiro para sitemap. Exposto como `/robots.txt`.
- `app/page.tsx`: `export const metadata` adicionado com title, description, keywords, canonical, openGraph (locale pt_BR) e twitter:card.
- `app/layout.tsx`: adicionado JSON-LD `Organization` (nome, URL, descrição, areaServed Paraguay); `robots: index/follow` e `openGraph` base no metadata do layout.

**UX**:
- `app/not-found.tsx` (novo): página 404 global com design consistente (fundo `#050816`, Navbar, Footer, 3 CTAs: Início, Catálogo, Buscar). Qualquer rota inexistente agora exibe UI de marca em vez do fallback genérico do Next.js.

**Performance**:
- `app/compare/[slug]/page.tsx`: double-fetch eliminado — `getCachedComparison = cache(getProductComparisonBySlug)` compartilhado entre `generateMetadata` e a função de página (mesmo padrão do ADR-021 aplicado em produto/loja).

**Validações**:
- Lint: 0 erros, 0 warnings (era 5).
- TypeScript: 0 erros.
- Build: 10 rotas (+ `/robots.txt` ○, `/sitemap.xml` ƒ, `/_not-found` ○ customizado).
- db:validate: 0 problemas.

---

## 2026-06-25 — ADR-019 ENCERRADO: migration 0007 aplicada + validação completa com chave anônima

**Hotfix da migration `0007_proposed_public_read_policies.sql`**:
- Versão anterior da migration usava `CREATE OR REPLACE POLICY` — sintaxe inválida em qualquer versão do PostgreSQL (válida para `FUNCTION`/`VIEW`/`RULE`, nunca para `POLICY`). Erro descoberto ao colar no SQL Editor do Supabase. Migration reescrita com o padrão idiomático correto: `DROP POLICY IF EXISTS "Public read access" ON <tabela>` seguido de `CREATE POLICY "Public read access" ON <tabela> FOR SELECT TO anon, authenticated USING (true)`. Aplicado para as 5 tabelas. Idempotente. Seguro para re-executar.

**Migration aplicada no Supabase SQL Editor pelo CTO** — resultado da query de verificação: 5 linhas com `cmd = 'r'` e `roles = {anon,authenticated}`, nenhuma linha com `cmd = 'w'`.

**Validação integral com chave anônima** (`database/seed/validate_adr019.js`, novo):
Script dedicado com 7 seções e 22 asserções, usando **exclusivamente** `NEXT_PUBLIC_SUPABASE_ANON_KEY` (zero uso da service role key). Resultado: **22 OK | 0 FAIL**.

| Seção | Resultado |
|---|---|
| 1. Leitura direta das 6 tabelas (ADR-019 core) | `brands` 3✓ · `categories` 3✓ · `products` 3✓ · `offers` 3✓ · `price_history` 3✓ · `stores` 3✓ |
| 2. Home (stores + brands + categories + products) | Mega Eletrônicos, Atacado Games, Shopping China · 5 marcas · 5 categorias · 4 produtos |
| 3. Produto `/product/[slug]` | iPhone 16 Pro / marca Apple / categoria Celulares · 2 ofertas (menor $999 @ Cellshop) · 4 relacionados |
| 4. Compare Engine `/compare/[slug]` | produto + 2 ofertas + 3 entradas de price_history via batch `.in()` |
| 5. Loja `/store/[slug]` | Cellshop / Ciudad del Este · 2 ofertas da loja · 3 lojas relacionadas |
| 6. Busca `/search` | 1 produto para "iPhone" · 1 loja para "cell" |
| 7. Catálogo `/products` (join completo) | 6 produtos total · join com offers + brands + categories em 1 query |

**ADR-019 encerrado**: a chave anônima lê todos os domínios públicos do catálogo. Não há mais dado visível ao service role que não seja visível ao anon. Escrita continua bloqueada para `anon`/`authenticated` (nenhuma policy de INSERT/UPDATE/DELETE foi criada).

Commits: `e69696b` (hotfix migration) + `aa5a325` (revisão anterior) — ambos em `main`.

---

## 2026-06-25 — Sprint 4.1: Public Release Readiness (Release 0.6)

Transição do ParaguAI de uma plataforma tecnicamente funcional para um MVP navegável: Home dinâmica com dados reais, double-fetch resolvido nas páginas de produto e loja, botão "Comparar preços" adicionado ao produto. ADR-019 (leitura pública bloqueada) permanece como único bloqueador restante — requer ação manual no Supabase SQL Editor.

**Arquivos criados**:
- **`app/product/[slug]/_cache.ts`** (novo): módulo compartilhado com funções `React.cache()` para produto e suas relações — eliminando double-fetch entre `layout.tsx` (metadata/JSON-LD) e `page.tsx` (renderização). Ver ADR-021.
- **`app/store/[slug]/_cache.ts`** (novo): equivalente para o domínio de Loja.

**Arquivos alterados**:
- **`app/page.tsx`** (Home): convertida de componente síncrono com dados hardcoded para `async` server component com `export const dynamic = "force-dynamic"` — busca `getStores()`, `getBrands()`, `getCategories()`, `getProductsCatalog({ perPage: 4 })` em paralelo via `Promise.all`. Todos os arrays `sampleStores`/`sampleProducts`/`sampleBrands` e o import de `sampleCategories` foram removidos. Dados reais fluem diretamente para os componentes sem alterar suas props.
- **`app/product/[slug]/page.tsx`**: convertido de `"use client"` + `useProduct()` para Server Component `async` — passa `params: Promise<{ slug: string }>`, chama `getCachedProduct`/`getCachedOffers`/`getCachedRelatedProducts` do `_cache.ts`, chama `notFound()` quando o produto não existe. Adicionado botão "Comparar preços" com ícone `Scale` (lucide-react), linkando para `comparePath(product.slug)`.
- **`app/product/[slug]/layout.tsx`**: refatorado para importar `getCachedProduct`/`getCachedOffers` do `_cache.ts` em vez de instanciar `React.cache()` localmente — remove as importações diretas de `getProductBySlug`/`getOffersByProduct`/`cache`.
- **`app/store/[slug]/page.tsx`**: convertido de `"use client"` + `useStore()` para Server Component `async` — mesmo padrão de produto.
- **`app/store/[slug]/layout.tsx`**: refatorado para importar `getCachedStore` do `_cache.ts`.
- **`types/product.ts`**: `ProductHighlight.priceUSD` e `storeName` tornados opcionais (`number | undefined` e `string | undefined`) — permite mapear `ProductCatalogItem` (onde `lowestPriceUSD` pode ser `null` e não há campo `storeName`) para `ProductHighlight` sem forçar dados falsos.
- **`constants/categories.ts`**: conteúdo substituído por comentário — os dados de exemplo (`sampleCategories`) foram migrados para `getCategories()` real via `category.service.ts`. O arquivo é preservado (sem `git rm`) por convenção do projeto.
- **`docs/DECISIONS.md`**: ADR-021 adicionado (módulo `_cache.ts` compartilhado).

**Performance obtida**:
- Double-fetch eliminado em `/product/[slug]` e `/store/[slug]`: de 2 fetches por entidade principal por visita para 1 (compartilhado via `React.cache()` entre layout e page).
- Home: de 0 queries ao Supabase (dados hardcoded) para 4 queries em paralelo por visita (stores, brands, categories, catalog).
- Nenhuma N+1 introduzida: `getProductsCatalog` usa `offers!left` (1 query com join); `Promise.all` paraleliza as 4 queries da Home.

**ADR-019 — status inalterado**: a chave anônima continua sem leitura pública em `brands`/`categories`/`products`/`offers`/`price_history`. As consultas da Home retornarão `[]` para tudo exceto stores até que `0007_proposed_public_read_policies.sql` seja aplicado. O código está correto — é um bloqueador de configuração, não de engenharia. Investigado durante a sprint: a Supabase Management API requer um Personal Access Token (PAT) diferente da service role key; a service role key não executa DDL via PostgREST; não há DATABASE_URL no projeto. A ação humana de colar o SQL no Supabase SQL Editor permanece o único caminho.

Validado: `npm run lint` (0 erros, 5 warnings pré-existentes), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso — 8 rotas, `/` agora `ƒ Dynamic`), `npm run db:validate` (0 problemas).

## 2026-06-25 — Sprint 4.0: Compare Engine v1 (Release 0.5)

Entrega o primeiro Compare Engine totalmente funcional do ParaguAI: compara um produto entre todas as lojas disponíveis usando dados reais do Supabase, com Price Engine integrado (histórico de preço por oferta), algoritmo de ranking de ofertas (ADR-014) e endpoint de API estruturado. Primeiro MVP visível da plataforma.

**Arquivos criados**:
- **`types/compare.ts`** (novo): `RankedOffer`, `CompareSummary`, `CompareResult` — types do Compare Engine.
- **`services/compare.service.ts`** (novo): `getProductComparisonBySlug(slug)` e `getProductComparison(productId)` — motor de comparação. Executa 3 queries no total para qualquer produto (1 produto + 1 ofertas com loja + 1 batch de price_history por `.in("offer_id", ids)`), evitando N+1; aplica o algoritmo de ranking da ADR-014 em memória; retorna `CompareResult` com `product`, `offers` (rankeadas) e `summary` (min/max/savings/storeCount/availableCount).
- **`app/api/compare/route.ts`** (novo): GET `/api/compare?slug=<slug>` ou `?productId=<uuid>` — endpoint JSON do Compare Engine. Headers de cache (`s-maxage=60, stale-while-revalidate=120`). Retorna 400 para parâmetros ausentes, 404 para produto inexistente, 200 com `CompareResult` para sucesso.
- **`hooks/useCompare.ts`** (novo): `useCompare(slug)` — hook client-side, mesma convenção de `useProduct`/`useStore`.
- **`components/compare/CompareSummary.tsx`** (novo): card de resumo com menor/maior preço, economia máxima (absoluta + percentual) e contagem de lojas/estoque.
- **`components/compare/CompareOfferCard.tsx`** (novo): card por oferta rankeada — rank badge, nome/rating/verificação da loja, badges (estoque/garantia/condição/cashback), métricas de histórico de preço (mínimo/máximo histórico + variação %), preço em USD e BRL, score de ranking, botão "Ver oferta".
- **`app/compare/[slug]/page.tsx`** (novo): Server Component, `async` — busca `getProductComparisonBySlug` e `getRelatedProducts` no servidor; `generateMetadata` (título/description/canonical/OG/Twitter com dados reais do produto); breadcrumb, header, summary, lista rankeada, produtos relacionados.
- **`app/compare/[slug]/loading.tsx`** (novo): skeleton animado durante fetch SSR.
- **`app/compare/[slug]/not-found.tsx`** (novo): 404 com links para catálogo e busca.
- **`app/compare/[slug]/error.tsx`** (novo): error boundary client com `unstable_retry`.
- **`database/seed/validate_compare.js`** (novo): script de validação do Compare Engine contra o Supabase real — 6 cenários: produto com várias ofertas, produto com 1 oferta, produto sem oferta, slug inexistente, leitura com chave anônima (diagnóstico ADR-019), validação do ranking. Todos passaram.

**Arquivos alterados**:
- **`constants/routes.ts`**: `comparePath(slug)` e `compareUrl(slug)` adicionados no mesmo padrão de `productPath`/`storePath`.

**Algoritmo de Ranking (ADR-014, primeira implementação)**:
Score composto 0–100 calculado em memória para cada oferta:
- Preço (50%): a oferta mais barata recebe 50; as demais decaem proporcionalmente (`50 * lowestPrice / price`).
- Disponibilidade (25%): `in_stock=true` → 25; `false` → 0.
- Confiabilidade da loja (15%): `store.rating` (0–5) normalizado para 0–15; loja sem rating recebe a média do conjunto (não é punida como "pior").
- Qualidade do cadastro (10%): proporção de campos preenchidos (`warranty`, `condition`, `product_url` da oferta; `phone`, `whatsapp`, `email`, `website`, `opening_hours` da loja).

**Validação executada (chave de serviço, contra dados reais)**:
1. `iphone-16-pro-256gb-titanio-preto` — 2 ofertas encontradas; Cellshop rankeada #1 (score 94) vs. Nissei #2 (score 92); preço mínimo histórico $949 corretamente capturado pelo Price Engine integrado — ✅
2. `smart-tv-samsung-55-4k-qled` — exatamente 1 oferta retornada — ✅
3. `playstation-5-slim` — produto encontrado, 0 ofertas retornadas (sem crash, graceful) — ✅
4. Slug inexistente — retorna `null` sem crash — ✅
5. Chave anônima — produto retorna `null` (RLS bloqueia, ADR-019 confirmado, 0007 ainda não aplicado) — ✅ (comportamento esperado diagnosticado)
6. Scores em ordem decrescente `[94, 92]` — ✅

**Dependência crítica não resolvida (ADR-019)**: a chave anônima (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), única usada por `lib/supabase.ts`, não lê `products`/`offers`/`price_history` — o Compare Engine retorna `null` para qualquer usuário real até que `0007_proposed_public_read_policies.sql` seja aplicado no SQL Editor do Supabase. Isso é o bloqueador #1 de todo o catálogo, não só do comparador — pré-existe a esta sprint (ADR-019, sprint 3.9). O endpoint `/api/compare` e a rota `/compare/[slug]` **estão corretos e completos**; só precisam que o dado seja visível pela chave pública.

Validado com `npm run lint` (0 erros, 5 warnings pré-existentes — nenhum novo), `npx tsc --noEmit` (0 erros), `npm run build` (sucesso — 8 rotas: as 6 anteriores + `/api/compare` + `/compare/[slug]`), `npm run db:validate` (0 problemas).

---

## 2026-06-25 — Sprint 4.3: Data Integrity & Media Foundation (Release 0.7 — fase final)

Última etapa técnica antes de declarar o Release 0.7 concluído. Foco: integridade estrutural do banco, fundação de imagens/storage, qualidade de código.

**Auditoria pré-migração (chave de serviço)**:
- 0 slugs duplicados em `stores`, `products`, `brands`, `categories`
- 0 slugs nulos em qualquer tabela
- 0 ofertas órfãs (offers.product_id / offers.store_id)
- 0 produtos com brand_id ou category_id inválidos
- 0 preços ≤ 0 ou nulos em `offers.price_usd`
- Contagem: `brands:5`, `categories:5`, `products:6`, `offers:9`, `price_history:3`, `stores:5`

**Migration `0008_data_integrity.sql`** (criada, aguarda aplicação no SQL Editor — mesmo fluxo de 0006/0007):
- Supersede `0002_revised_store_data_layer.sql` e `0004_proposed_catalog_integrity_and_indexes.sql`
- Idempotente: `DO $$ IF NOT EXISTS ... $$` para UNIQUE constraints; `CREATE INDEX IF NOT EXISTS` para índices
- UNIQUE constraints: `stores_slug_unique`, `products_slug_unique`, `brands_slug_unique`, `categories_slug_unique`
- Índices: `offers_product_id_idx`, `offers_store_id_idx`, `offers_price_usd_idx`, `products_brand_id_idx`, `products_category_id_idx`, `price_history_offer_id_recorded_at_idx`
- Inclui query de verificação no final (constraints + índices esperados)
- Ver ADR-023

**Storage Foundation** (aplicado programaticamente com chave de serviço):
- Bucket `catalog` criado no Supabase Storage: `public: true`, mimeTypes `webp/jpeg/png/avif`, limite 5 MB
- URL base: `https://acairzpzsklctaqjsukw.supabase.co/storage/v1/object/public/catalog/`
- Estrutura de pastas: `products/{slug}/main.webp`, `products/{slug}/gallery/{n}.webp`, `stores/{slug}/cover.webp`, `stores/{slug}/logo.webp`, `brands/{slug}/logo.webp`
- Ver ADR-022

**Arquivos criados**:
- **`database/migrations/0008_data_integrity.sql`**: migration final idempotente (0002 + 0004 consolidadas)
- **`database/storage/init.js`**: script Node que cria o bucket via service role key (`npm run storage:init`)
- **`database/seed/validate_sprint43.js`**: 23 asserções — contagem, slugs, FKs, preços, Storage (`npm run db:validate:43`)
- **`utils/storage.ts`**: utilitário TypeScript com `catalogStorage.*` (builders de URL por entidade) e `resolveImageUrl` (fallback automático para Storage quando `image_url` está nulo)

**Arquivos alterados**:
- **`package.json`**: scripts `db:validate:43` e `storage:init` adicionados
- **`eslint.config.mjs`**: `database/storage/**` adicionado ao `globalIgnores` (tooling Node, fora da árvore TS/Next.js)
- **`docs/DECISIONS.md`**: ADR-022 (Storage Foundation) + ADR-023 (Migration 0008) adicionados

**Validações executadas**:
- `npm run lint`: 0 erros, 0 warnings
- `npx tsc --noEmit`: 0 erros
- `npm run build`: 10 rotas — idêntico ao Sprint 4.2 (sem regressão)
- `npm run db:validate:43`: 23 OK | 0 falhas (catálogo, slugs, FKs, preços, Storage)
- `npm run storage:init`: bucket `catalog` criado com sucesso

**Pendência restante (ação manual no Supabase)**:
1. Aplicar `database/migrations/0008_data_integrity.sql` no SQL Editor → confirmação esperada: 4 UNIQUE constraints + 6 índices
2. Upload de imagens reais no bucket `catalog` seguindo a convenção de nomenclatura definida no ADR-022
