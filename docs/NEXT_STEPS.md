# NEXT_STEPS.md

Proposta de continuação, baseada no estado real do código (não no roadmap aspiracional original) e no roadmap pré-existente em `docs/ROADMAP.md`.

## Sprint 3.2 (encerrada)

Consolidação de engenharia sem features novas: unificação de `process.env` em `lib/env.ts`, correção do `.gitignore`/`.env.example`, limpeza de `package.json`, e criação de 6 documentos permanentes (`DECISIONS`, `CONVENTIONS`, `API_CONTRACTS`, `DOMAIN_MODEL`, `COMPONENT_INDEX`, `DEPENDENCY_GRAPH`). Ver `docs/CHANGELOG.md` para o detalhe completo. `npm run lint`/`typecheck`/`build` confirmados limpos após as mudanças.

## Sprint 3.3 (encerrada nesta auditoria)

Diferente do que esta seção propunha anteriormente (fechar o Domínio de Loja), a sprint que efetivamente rodou implementou o **Domínio de Busca** (Release 0.4, parte 1 — equivalente à antiga "Sprint B" proposta abaixo): `app/search/page.tsx` lê `searchParams.q` e ganha `generateMetadata`; `hooks/useSearch.ts` e `services/search.service.ts` saem de placeholder/código morto; `SearchResults` renderiza resultados reais agrupados por tipo; `loading.tsx`/`error.tsx`/`SearchResultsSkeleton` espelham o padrão de `/product/[slug]`; `app/layout.tsx` ganhou metadata real + JSON-LD `WebSite`/`SearchAction`. Ver `docs/CHANGELOG.md` para o detalhe completo. Validado com `npm run lint`/`typecheck`/`build`.

O **Domínio de Loja** (Release 0.3), que esta seção recomendava priorizar, continua pendente — vira a Sprint 3.4 proposta abaixo.

## Sprint 3.4 (proposta)

**Objetivo**: fechar o Domínio de Loja (Release 0.3 do roadmap), que está pela metade desde antes da Sprint 3.2 — é o domínio mais próximo de "quase pronto" e replica um padrão já validado pelos Domínios de Produto e (agora) Busca.

**Escopo**: implementar `hooks/useStore.ts`, `components/store/StoreGrid.tsx`, `components/store/StoreDetails.tsx`, criar `app/store/[slug]/` (page + layout com metadata/JSON-LD + loading/error/not-found, espelhando `app/product/[slug]/`), decidir e implementar `getStoreBySlug` em `store.service.ts` (hoje só existe `getStore(id)`), adicionar `storePath()`/`storeUrl()` em `constants/routes.ts`.

**Subtarefas**:
1. `store.service.ts`: adicionar `getStoreBySlug(slug)`, manter ou aposentar `getStore(id)` conforme uso real.
2. `hooks/useStore.ts`: espelhar `useProduct.ts` (loading/notFound/dados).
3. `components/store/StoreGrid.tsx`: grid reaproveitando `StoreCard`, análogo a `RelatedProducts`.
4. `components/store/StoreDetails.tsx`: cabeçalho/perfil da loja (nome, banner, rating, descrição, localização) — decidir se lista as ofertas/produtos da loja nesta etapa ou em uma sprint seguinte (recomendo deixar para depois, manter escopo pequeno).
5. `app/store/[slug]/`: `page.tsx`, `layout.tsx` (metadata + JSON-LD tipo `LocalBusiness`/`Organization`), `loading.tsx`, `error.tsx`, `not-found.tsx`.
6. Atualizar `Navbar`/`Footer`/`StoreCard` para usar `storePath()` em vez de string literal.
7. Atualizar `docs/FEATURES.md`/`PROJECT_STATUS.md` movendo Loja de "em desenvolvimento" para "concluído".

**Riscos**: 🟢 Baixo — o padrão de Produto e Busca já validou a abordagem; principal incerteza é se `getStore` deveria mudar de `id` para `slug` (decisão pequena, mas que afeta a assinatura de uma função já existente).

**Dependências**: nenhuma bloqueante — `services/store.service.ts` e `types/store.ts` já existem e funcionam; depende apenas de implementação, não de decisão de schema novo.

**Estimativa**: 3–4 dias.

**Impacto no produto**: fecha o terceiro dos três domínios centrais da Home (Produto, Busca, Loja) com dados reais navegáveis, tornando os cards de loja da Home (`FeaturesStores`) finalmente clicáveis em vez de levarem a 404.

## Sprint atual (avaliação)

Release 0.2 (Produto) e Release 0.4 parte 1 (Busca) estão concluídos. Release 0.3 (Domínio de Loja) é o único domínio central da Home ainda pendente — `StoreCard` pronto, `StoreGrid`/`StoreDetails`/`useStore`/rota `/store/[slug]` faltando.

**Próxima sprint recomendada**: Sprint 3.4 — fechar o Release 0.3 (Loja), fechando os três domínios centrais da Home antes de avançar para filtros/paginação da Busca (fase 2) ou para releases posteriores.

---

## Roadmap proposto (próximos passos imediatos)

### Sprint 3.4 — Fechar o Domínio de Loja (Release 0.3)
- **Prioridade**: 🔴 Alta
- **Risco**: Baixo (padrão já estabelecido pelos Domínios de Produto e Busca, é replicar a fórmula)
- **Complexidade**: Média
- **Estimativa**: 3–4 dias
- Tarefas: ver detalhamento da Sprint 3.4 acima.

### Sprint C — Eliminar dívidas técnicas críticas antes de crescer mais
- **Prioridade**: 🟡 Média (mas crescente — quanto mais o código cresce, mais caro fica)
- **Risco**: Baixo
- **Complexidade**: Baixa–Média
- **Estimativa**: 1–2 dias (reduzida — unificação de `lib/supabase.ts`/`lib/env.ts` já concluída na Sprint 3.2, ver `docs/CHANGELOG.md`)
- Tarefas restantes: resolver o double-fetch de produto (mover fetch para o server, reduzir `app/product/[slug]/page.tsx` a ilhas client), trocar `<img>` por `next/image` nos 5 componentes apontados pelo lint. (`app/layout.tsx` já ganhou metadata real na Sprint 3.3.)

### Sprint D — Listagem de produtos (`/products`) e categorias dinâmicas
- **Prioridade**: 🟡 Média
- **Risco**: Baixo
- **Complexidade**: Baixa
- **Estimativa**: 2 dias
- Tarefas: implementar `ProductGrid`, rota `/products` (com filtro por categoria), `services/category.service.ts`/`brand.service.ts` para substituir os mocks da Home por dados reais.

### Releases seguintes (sem mudança em relação ao roadmap pré-existente)
0.5 Comparação de produtos → 0.6 Assistente de IA → 0.7 Painel Admin → 0.8 Crawler → 0.9 Plataforma de usuário (Auth/Favoritos reais/Histórico) → 1.0 Produção (SEO/Performance/Acessibilidade/PWA/Monitoramento). Ver `docs/ROADMAP.md` para o detalhamento original — segue válido como visão de longo prazo.

---

## Auditoria final (notas de 1 a 5)

| Critério | Nota | Justificativa |
|---|---|---|
| Arquitetura | ★★★★☆ | Camadas bem definidas e majoritariamente respeitadas; perde 1 ponto pelo double-fetch produto e pela página de produto ser 100% client. |
| UX | ★★★☆☆ | Home, produto e busca têm boa execução visual e funcionam de fato; mas navegação ainda tem múltiplos links mortos (`/stores`, `/products`, `/compare`, `/categories/[slug]`, etc.). |
| SEO | ★★★★☆ | Produto e Busca têm metadata+JSON-LD bem feitos (incluindo `SearchAction` no root layout); falta só Home ganhar Open Graph/canonical próprios e sitemap/robots.txt. |
| Performance | ★★★☆☆ | Sem otimizações graves visíveis, mas `<img>` em vez de `next/image` em 5 lugares, e fetch duplicado de produto a cada visita. |
| Escalabilidade | ★★★★☆ | Modelagem de dados (price na offer, não no produto) e separação em camadas são boas bases; falta apenas amadurecer hooks/services que ainda faltam. |
| Organização | ★★★★☆ | Estrutura de pastas clara e consistente; only ruído real é o volume de placeholders vazios sem marcação padronizada. |
| Código | ★★★★☆ | TypeScript estrito, convenções de service consistentes, zero erros de lint/TS; perde ponto pelos `as Tipo[]` sem validação. |
| Manutenibilidade | ★★★★☆ | Convenções claras e documentadas (`CLAUDE.md`), fácil para outro dev continuar; risco principal é justamente arquivo vazio parecendo implementado (causou o incidente de deploy desta sessão). |
| Prontidão para Produção | ★★☆☆☆ | Build/lint/TS passam e o deploy na Vercel foi corrigido, mas a maioria das rotas do menu não existe e dados da Home são mockados — não está pronto para usuários reais ainda. |

**Média geral: ≈ 3,6/5** — fundação sólida, execução incompleta, mas com a Busca saindo do estado decorativo. Consistente com a estimativa de **35%** em `docs/PROJECT_STATUS.md`.
