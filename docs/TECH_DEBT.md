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

Ver `docs/DECISIONS.md` ADR-009 para o detalhe completo da correção.

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

- `ProductCard`, `ProductGallery` (×2), `StoreCard` usam `<img>` nativo em vez de `next/image` — perda de otimização automática de imagem (lazy loading nativo do Next, `srcset`, dimensionamento). Mesmos warnings de lint de antes; a unificação `ProductCard`/`ProductHighlightCard` (Sprint 3.5, ADR-010) não mudou esse ponto, só reduziu para um componente em vez de dois.
- Fetch duplicado de produto entre `layout.tsx` (server) e `page.tsx` (client via `useProduct`) — toda visita à página de produto consulta o Supabase ao menos duas vezes para os mesmos dados (ver `ARCHITECTURE.md`). **O mesmo padrão foi replicado deliberadamente em `app/store/[slug]/`** (Sprint 3.4, para manter consistência arquitetural com Produto, conforme pedido) — `layout.tsx` busca a loja para metadata/JSON-LD, `page.tsx` busca de novo via `useStore`. Resolver os dois ao mesmo tempo é candidato a uma sprint futura de performance.
- `app/product/[slug]/page.tsx` e (desde a Sprint 3.4) `app/store/[slug]/page.tsx` são inteiramente `"use client"` — perdem os benefícios de streaming/SSR do App Router para o conteúdo principal, que poderia ser Server Component com apenas os botões de ação como ilhas client.

## SEO

- ~~`app/layout.tsx` com metadata padrão do `create-next-app`~~ — **resolvido na Sprint 3.3**: título/descrição reais + JSON-LD `WebSite`/`SearchAction`.
- ~~Só `/product/[slug]` tinha `generateMetadata`~~ — **resolvido parcialmente na Sprint 3.3**: `/search` ganhou `generateMetadata` (canonical/OG/robots). Home ainda não tem Open Graph nem canonical próprios.
- Sem `sitemap.xml`/`robots.txt` (não existem em `app/`).

## Busca (Sprint 3.3) — limitações conhecidas

- Produtos retornados pela busca não exibem preço — `searchEverything` consulta só `products.name`, sem join com `offers` (preço pertence à oferta, não ao produto, ver `DOMAIN_MODEL.md`). Resolver exigiria uma query agregada (menor preço por produto) ou aceitar N+1 nos resultados.
- `SearchResults`/`Categories.tsx` linkam para `/categories/${slug}`, rota que não existe ainda.
- Sem filtro por tipo, paginação ou autocomplete — cada seção é limitada a 8 resultados (`RESULTS_PER_SECTION` em `search.service.ts`) sem forma de ver mais.

## Domínio de Loja (Sprint 3.4) — limitações conhecidas

- ~~Contato e horário de funcionamento não implementados porque não existem como colunas em `stores`~~ — **corrigido na Sprint 3.4.1** (achado: as colunas já existiam) **e implementado na Sprint 3.5** (ADR-009): `StoreDetails.tsx` agora exibe telefone/WhatsApp/e-mail/site/endereço/horário quando a loja tem esses dados preenchidos.
- ~~Achado de dados: as 5 lojas reais no Supabase têm `slug: null`/`active: null`, e `products`/`offers`/`brands`/`categories` vazias~~ — **resolvido na Sprint 3.8** (ADR-007 fechado, ver ADR-016): seed executado com sucesso, `stores` com `slug`/`active` preenchidos, 5 brands/categories, 6 products, 9 offers. `/store/[slug]`, `/product/[slug]`, a Busca e o `/products` agora têm dados reais navegáveis em produção.
- **Achado novo (Sprint 3.6)**: nem todo o conteúdo de loja está ausente — `website` e `opening_hours` já estão preenchidos nas 5 lojas reais, e `address` em 4 das 5 (só falta `slug`, `active` e `cover_image`). Uma pequena inconsistência de qualidade de dado também apareceu: `whatsapp` é string vazia (`""`) em uma loja, em vez de `null` como nas demais — verificado que `StoreDetails.tsx` (`store.whatsapp ? ... : null`) já trata `""` como ausente corretamente (string vazia é falsy em JS), então não é um bug de código, só um dado a normalizar quando o backfill da Sprint 3.7 acontecer.
- **Avaliações** — seção "Avaliações em breve" usa `EmptyState` genuinamente vazio (sem reviews mocadas), porque `types/review.ts` e a tabela `reviews` ainda não existem (ver `DOMAIN_MODEL.md`). Vira uma seção real só quando o domínio de Reviews for implementado.
- **"Produtos da loja" e "ofertas" unificados em `StoreOffers`** — decisão deliberada para não duplicar lógica/templates: cada oferta da loja já mostra o produto (nome + link) e os termos da oferta (preço, estoque, garantia, cashback) na mesma linha, em vez de duas seções separadas mostrando os mesmos dados de formas diferentes.
- Links de `/categories/[slug]` (ver seção Busca acima) continuam mortos; `/stores` (listagem de lojas, distinta de `/store/[slug]`) também continua sem rota própria — só `/products` foi fechado nesta sprint.

## Catálogo de produtos (Sprint 3.5) — limitações conhecidas

- **Ordenação por preço é "best effort"** — `getProductsCatalog` corrige a ordem da página já buscada (sempre correta para o que é exibido), mas não garante ordem global perfeita entre páginas diferentes em catálogos grandes, porque o PostgREST não ordena nativamente por uma agregação (`MIN(offers.price_usd)` por produto) sem uma view/RPC. Proposta de correção (materialized view, não aplicada): `database/migrations/0003_proposed_product_catalog_price_view.sql`. Ver `docs/DECISIONS.md` ADR-011. Filtros (categoria/marca/loja/disponibilidade/faixa de preço) e paginação **não** têm essa limitação — são resolvidos nativamente via `offers!inner` e são corretos e escaláveis hoje.
- **"Mais vendidos"/"Melhor avaliação" são estrutura preparada, não funcionais** — `ProductCatalogSort` inclui `best_selling`/`top_rated` e a UI (`ProductFilters`) já oferece as opções (marcadas "em breve"), mas o serviço cai em `created_at desc` para ambos, porque não existe nenhuma coluna de contagem de vendas ou nota média por produto no schema real hoje. Vira funcional quando esses dados existirem (ex.: contagem agregada de pedidos, ou média de `reviews` quando esse domínio existir).
- Sem dados reais (`products` vazia, ver achado de dados acima), o catálogo não pôde ser testado manualmente contra resultados reais nesta sprint — validado estruturalmente (lint/typecheck/build) e por leitura de código.

## Fundação de dados (Sprint 3.7/3.8)

- ~~Seed implementado, não testado contra escrita real~~ — **resolvido na Sprint 3.8**: `npm run db:seed:execute` rodou com sucesso usando `SUPABASE_SERVICE_ROLE_KEY` (a chave anônima de fato não tem permissão de escrita por RLS em `brands`/`categories`/`products`, confirmado ao vivo — ver ADR-016). Banco hoje: `stores: 5` (slug/active preenchidos), `brands: 5`, `categories: 5`, `products: 6`, `offers: 9`.
- ~~Achado: `database/seed/index.js` (backfill de `stores`) loga `[OK]` mesmo quando a RLS filtra o `UPDATE` silenciosamente~~ — **corrigido na Sprint 3.9** (ADR-016/ADR-017): o `UPDATE` agora usa `.select("id")` e loga `[AVISO]` quando 0 linhas são afetadas, em vez de assumir sucesso. Testado contra o Supabase real com a chave anônima (cenário que reproduz o bug original) — confirmado que a detecção funciona.
- **Detecção de oferta "órfã" em `validate.js` é por `IS NULL`, não por anti-join real** — agora com 5/5/6/9 linhas, a Sprint 3.8 fez uma auditoria complementar em memória (anti-join real, com a chave de serviço) e confirmou 0 FKs órfãs hoje; `validate.js` em si continua sem essa verificação (não escala para volume real via fetch-and-diff). Quando houver mais volume, precisa de uma consulta dedicada (ou um RPC).
- **Offer Ranking (ADR-014) continua arquitetura, não código** — nenhuma ordenação nova implementada; `getOffersByProduct`/`getOffersByStore` continuam ordenando só por `price_usd`.

## Price Engine v1 (Sprint 3.9) — limitações conhecidas

- **`price_history` ainda não existe no Supabase real** — `database/migrations/0006_proposed_price_history.sql` está escrita e revisada, mas não aplicada: nenhuma ferramenta deste projeto executa DDL contra o Supabase (`@supabase/supabase-js` só faz CRUD via PostgREST; sem `pg`/`DATABASE_URL`, sem Supabase CLI configurado, sem RPC de SQL arbitrário exposta — confirmado por introspecção do OpenAPI do PostgREST). Ver ADR-017. Aplicar requer colar o SQL no painel do Supabase (ação humana, não pendência de código).
- **`updateOfferPrice()`/`getOfferPriceMetrics()` (`services/offer.service.ts`) estão code-complete, mas sem nenhum chamador real ainda** — nenhuma página/componente os usa (por instrução explícita da Sprint 3.9: "sem implementar interface final"). `getOfferPriceMetrics` foi testado e confirma degradação graciosa (retorna preço atual real, `null` nos campos de histórico) enquanto `price_history` não existir; `updateOfferPrice` segue o mesmo padrão (retorna `null` em vez de lançar) mas ainda não foi exercido com a tabela real criada.
- **`updateOfferPrice()` herda o mesmo bloqueio de RLS do ADR-016** — escrito para ser chamado pela aplicação (`lib/supabase.ts`, chave anônima), mas a mesma RLS que bloqueou `brands`/`categories`/`products` na Sprint 3.8 provavelmente bloqueia `offers`/`price_history` também (não testado com a chave anônima nesta sprint, só inferido por consistência de política). Quando o Admin (Release 0.7) ou Crawler (Release 0.8) existirem, vão precisar de uma policy de RLS dedicada ou de rodar com uma credencial diferente da chave anônima pública — decisão de segurança a tomar naquele momento, não nesta sprint.
- **`/compare` não existe** — `getOfferPriceMetrics` é o insumo por oferta; uma agregação por produto (cruzando todas as ofertas) ainda não foi escrita, fica para quando a tela for implementada de fato.

## Acessibilidade

- `Navbar`/`Footer`/diversos componentes não têm problemas graves visíveis, mas não há testes/varredura de a11y configurada (sem `eslint-plugin-jsx-a11y` explícito além do que `eslint-config-next` já cobre).
- `components/ui/Input.tsx` e `components/ui/Select.tsx` (Sprint 3.5) usam `<label>`/atributos nativos do elemento, mas não foram auditados formalmente. `components/ui/SearchInput.tsx` continua vazio — reservado para um campo de busca com ícone embutido, distinto do `Input` genérico.

## Suspense / Streaming / Loading / Error Boundaries

- `app/product/[slug]/` tem o conjunto completo (`loading.tsx`, `error.tsx`, `not-found.tsx`); `app/search/` ganhou `loading.tsx`/`error.tsx` na Sprint 3.3; `app/products/` ganhou o mesmo conjunto na Sprint 3.5 (sem `not-found.tsx` em nenhum dos dois — não se aplica, listas sem resultado não são 404). `/` (Home) ainda não tem nenhum dos três — uma falha de fetch futura (quando ela parar de usar mock) não terá tratamento de erro de página.
- ~~Nenhum uso de `<Suspense>` explícito~~ — **parcialmente resolvido na Sprint 3.3, ampliado na Sprint 3.5**: `app/search/page.tsx` e `app/products/page.tsx` usam `<Suspense>` para a seção de resultados (filtros/cabeçalho renderizam fora do Suspense, sem esperar a query paginada). Ainda não é um padrão usado em `/product/[slug]`/`/store/[slug]` (página inteira client) ou na Home.

## Outras observações de organização

- Arquivos ainda rastreados pelo Git como vazios (0 bytes ou 1 linha): `services/ai.service.ts`, `hooks/useOffers.ts`, `types/{user,review}.ts`, `components/ui/{Card,Loading,SearchInput}.tsx`, `utils/{format,slug,validators}.ts`, `constants/{config,colors,navigation,currencies,countries,restrictedProducts}.ts`, `styles/{theme,typography,spacing,radius,shadows}.ts`. A Sprint 3.5 preencheu `services/{brand,category}.service.ts`, `components/ui/{Input,Select}.tsx`, `components/product/ProductGrid.tsx` e `utils/search.ts` (antes vazios). Convenção deliberada do projeto (placeholders para trabalho futuro, conforme `CLAUDE.md`), mas o volume ainda cria ruído real: é fácil esquecer qual arquivo tem conteúdo sem abri-lo. Vale considerar um marcador padronizado (ex.: comentário `// TODO(release-x): implementar` em cada placeholder) para diferenciar "vazio de propósito" de "vazio por esquecimento".
- `database/migrations`/`seed`/`sql` praticamente vazios — sem versionamento de schema real, todo o estado do banco vive só no painel do Supabase. A Sprint 3.4 adicionou `0001_proposed_store_contact_hours.sql`; a Sprint 3.4.1 marcou esse arquivo como **superado** (propunha colunas que já existiam) e adicionou `0002_revised_store_data_layer.sql` em seu lugar. Ambos são **propostas não aplicadas** — continua sem processo formal de migrations versionadas. Risco de drift entre ambientes e impossibilidade de recriar o banco a partir do repositório.
- ~~`package.json` script `format` (Prettier) quebrado~~ — **resolvido na Sprint 3.2**: removido por não haver `prettier` instalado (ADR-003). Adotar Prettier formalmente (com `.prettierrc` + `eslint-config-prettier`) é uma decisão própria, ainda não tomada.
- ~~`.env.example` nunca chegava ao Git~~ — **resolvido na Sprint 3.2**: `.gitignore` tinha uma regra `.env*` sem exceção; corrigido com `!.env.example`, e o arquivo foi movido de `lib/.env.example` (local não convencional) para a raiz (ADR-002).
