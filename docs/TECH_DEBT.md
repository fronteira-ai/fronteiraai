# TECH_DEBT.md

Itens identificados por leitura completa do código. Nenhum é bloqueante hoje (build/lint/TS passam), mas todos custam mais quanto mais tarde forem corrigidos.

## Componentes duplicados / quase-duplicados

- `ProductCard` vs `ProductHighlightCard` — mesma estrutura visual (imagem + nome + preço + link), tipos de entrada diferentes (`Product` vs `ProductHighlight`). Candidato a unificação com props opcionais em vez de dois componentes.
- `constants/routes.ts` só tem `productPath`/`productUrl`; `StoreCard` monta o link da loja como string literal. Quando `/store/[slug]` for criado, isso deveria virar `storePath()`/`storeUrl()` no mesmo padrão.

## Hooks incompletos

- `useStore`, `useOffers` existem como arquivos vazios. Isso é ambíguo no Git/IDE: parecem implementados (aparecem no histórico, no autocomplete de import) até serem abertos. Risco real de alguém importar e só descobrir o problema em runtime/build.
- ~~`useSearch` vazio~~ — **resolvido na Sprint 3.3**: implementado, usado por `SearchBar`.
- `useFavorites` funciona, mas não tem nenhuma forma de sincronizar entre abas/dispositivos nem de migrar para favoritos por usuário quando autenticação existir — vai precisar de um plano de migração de dados do `localStorage`.

## Tipagem

- Todos os services fazem `return data as Product[]` (cast direto, sem validação) — uma mudança de coluna no Supabase não é pega pelo TypeScript, só em runtime/produção.
- `getStore(id)` não tem tipo de retorno explícito (`Promise<...>` implícito), diferente de todos os outros métodos de service que declaram o tipo de retorno.
- ~~`lib/supabase.ts` usa `process.env.X!`~~ — **resolvido na Sprint 3.2**: `lib/env.ts` é a única fonte de `process.env`, com mensagens de erro distintas para ambiente local/Vercel (ADR-001). Verificado com `npm run build` e com teste manual de `.env.local` ausente.

## Performance

- `ProductCard`, `ProductGallery` (×2), `ProductHighlightCard`, `StoreCard` usam `<img>` nativo em vez de `next/image` (5 warnings de lint `@next/next/no-img-element`) — perda de otimização automática de imagem (lazy loading nativo do Next, `srcset`, dimensionamento).
- Fetch duplicado de produto entre `layout.tsx` (server) e `page.tsx` (client via `useProduct`) — toda visita à página de produto consulta o Supabase ao menos duas vezes para os mesmos dados (ver `ARCHITECTURE.md`).
- `app/product/[slug]/page.tsx` é inteiramente `"use client"` — perde os benefícios de streaming/SSR do App Router para o conteúdo principal, que poderia ser Server Component com apenas os botões de ação como ilhas client.

## SEO

- ~~`app/layout.tsx` com metadata padrão do `create-next-app`~~ — **resolvido na Sprint 3.3**: título/descrição reais + JSON-LD `WebSite`/`SearchAction`.
- ~~Só `/product/[slug]` tinha `generateMetadata`~~ — **resolvido parcialmente na Sprint 3.3**: `/search` ganhou `generateMetadata` (canonical/OG/robots). Home ainda não tem Open Graph nem canonical próprios.
- Sem `sitemap.xml`/`robots.txt` (não existem em `app/`).

## Busca (Sprint 3.3) — limitações conhecidas

- Produtos retornados pela busca não exibem preço — `searchEverything` consulta só `products.name`, sem join com `offers` (preço pertence à oferta, não ao produto, ver `DOMAIN_MODEL.md`). Resolver exigiria uma query agregada (menor preço por produto) ou aceitar N+1 nos resultados.
- `SearchResults`/`Categories.tsx` linkam para `/categories/${slug}`, rota que não existe ainda — mesmo padrão de link morto que `StoreCard`→`/store/[slug]` tem hoje (Domínio de Loja ainda pendente, ver `NEXT_STEPS.md`).
- Sem filtro por tipo, paginação ou autocomplete — cada seção é limitada a 8 resultados (`RESULTS_PER_SECTION` em `search.service.ts`) sem forma de ver mais.

## Acessibilidade

- `Navbar`/`Footer`/diversos componentes não têm problemas graves visíveis, mas não há testes/varredura de a11y configurada (sem `eslint-plugin-jsx-a11y` explícito além do que `eslint-config-next` já cobre).
- `components/ui/Input.tsx` e `SearchInput.tsx` estão vazios — quando forem implementados, vale garantir labels/aria desde o início em vez de retrofit.

## Suspense / Streaming / Loading / Error Boundaries

- `app/product/[slug]/` tem o conjunto completo (`loading.tsx`, `error.tsx`, `not-found.tsx`); `app/search/` ganhou `loading.tsx`/`error.tsx` na Sprint 3.3 (sem `not-found.tsx` — não se aplica, busca sem resultado não é 404). `/` (Home) ainda não tem nenhum dos três — uma falha de fetch futura (quando ela parar de usar mock) não terá tratamento de erro de página.
- ~~Nenhum uso de `<Suspense>` explícito~~ — **parcialmente resolvido na Sprint 3.3**: `app/search/page.tsx` usa `<Suspense fallback={SearchResultsSkeleton}>` para a seção de resultados. Ainda não é um padrão usado em `/product/[slug]` ou na Home.

## Outras observações de organização

- Grande quantidade de arquivos rastreados pelo Git como vazios (0 bytes ou 1 linha): `services/{brand,category,ai}.service.ts`, `hooks/{useStore,useSearch,useOffers}.ts`, `types/{user,review,search}.ts`, `components/ui/{Card,EmptyState,Input,Loading,SearchInput}.tsx`, `components/{product/ProductGrid,store/StoreGrid,store/StoreDetails}.tsx`, `utils/{format,search,slug,validators}.ts`, `constants/{config,colors,navigation,currencies,countries,restrictedProducts}.ts`, `styles/{theme,typography,spacing,radius,shadows}.ts`. Isso é uma convenção deliberada do projeto (placeholders para trabalho futuro, conforme `CLAUDE.md`), mas o volume atual cria ruído real: é fácil esquecer qual arquivo tem conteúdo sem abri-lo. Vale considerar um marcador padronizado (ex.: comentário `// TODO(release-x): implementar` em cada placeholder) para diferenciar "vazio de propósito" de "vazio por esquecimento" — foi exatamente esse padrão (arquivo vazio committado por engano) que causou a falha de build na Vercel investigada nesta sessão (`types/store.ts` ficou vazio no HEAD por um commit incompleto).
- `database/migrations`/`seed`/`sql` vazios — sem versionamento de schema, todo o estado do banco vive só no painel do Supabase. Risco de drift entre ambientes e impossibilidade de recriar o banco a partir do repositório.
- ~~`package.json` script `format` (Prettier) quebrado~~ — **resolvido na Sprint 3.2**: removido por não haver `prettier` instalado (ADR-003). Adotar Prettier formalmente (com `.prettierrc` + `eslint-config-prettier`) é uma decisão própria, ainda não tomada.
- ~~`.env.example` nunca chegava ao Git~~ — **resolvido na Sprint 3.2**: `.gitignore` tinha uma regra `.env*` sem exceção; corrigido com `!.env.example`, e o arquivo foi movido de `lib/.env.example` (local não convencional) para a raiz (ADR-002).
