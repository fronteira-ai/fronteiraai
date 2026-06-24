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
