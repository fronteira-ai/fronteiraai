# NEXT_STEPS.md

Proposta de continuação, baseada no estado real do código (não no roadmap aspiracional original) e no roadmap pré-existente em `docs/ROADMAP.md`.

## Sprint 3.2 (encerrada nesta auditoria)

Consolidação de engenharia sem features novas: unificação de `process.env` em `lib/env.ts`, correção do `.gitignore`/`.env.example`, limpeza de `package.json`, e criação de 6 documentos permanentes (`DECISIONS`, `CONVENTIONS`, `API_CONTRACTS`, `DOMAIN_MODEL`, `COMPONENT_INDEX`, `DEPENDENCY_GRAPH`). Ver `docs/CHANGELOG.md` para o detalhe completo. `npm run lint`/`typecheck`/`build` confirmados limpos após as mudanças.

## Sprint 3.3 (proposta)

**Objetivo**: fechar o Domínio de Loja (Release 0.3 do roadmap), que está pela metade desde antes desta auditoria — é o domínio mais próximo de "quase pronto" e replica um padrão já validado pelo Domínio de Produto.

**Escopo**: implementar `hooks/useStore.ts`, `components/store/StoreGrid.tsx`, `components/store/StoreDetails.tsx`, criar `app/store/[slug]/` (page + layout com metadata/JSON-LD + loading/error/not-found, espelhando `app/product/[slug]/`), decidir e implementar `getStoreBySlug` em `store.service.ts` (hoje só existe `getStore(id)`), adicionar `storePath()`/`storeUrl()` em `constants/routes.ts`.

**Subtarefas**:
1. `store.service.ts`: adicionar `getStoreBySlug(slug)`, manter ou aposentar `getStore(id)` conforme uso real.
2. `hooks/useStore.ts`: espelhar `useProduct.ts` (loading/notFound/dados).
3. `components/store/StoreGrid.tsx`: grid reaproveitando `StoreCard`, análogo a `RelatedProducts`.
4. `components/store/StoreDetails.tsx`: cabeçalho/perfil da loja (nome, banner, rating, descrição, localização) — decidir se lista as ofertas/produtos da loja nesta etapa ou em uma sprint seguinte (recomendo deixar para depois, manter escopo pequeno).
5. `app/store/[slug]/`: `page.tsx`, `layout.tsx` (metadata + JSON-LD tipo `LocalBusiness`/`Organization`), `loading.tsx`, `error.tsx`, `not-found.tsx`.
6. Atualizar `Navbar`/`Footer`/`StoreCard` para usar `storePath()` em vez de string literal.
7. Atualizar `docs/FEATURES.md`/`PROJECT_STATUS.md` movendo Loja de "em desenvolvimento" para "concluído".

**Riscos**: 🟢 Baixo — o padrão de Produto já validou a abordagem; principal incerteza é se `getStore` deveria mudar de `id` para `slug` (decisão pequena, mas que afeta a assinatura de uma função já existente).

**Dependências**: nenhuma bloqueante — `services/store.service.ts` e `types/store.ts` já existem e funcionam; depende apenas de implementação, não de decisão de schema novo.

**Estimativa**: 3–4 dias.

**Impacto no produto**: fecha o segundo dos três domínios centrais da Home (Produto, Loja, Busca) com dados reais navegáveis, tornando os cards de loja da Home (`FeaturesStores`) finalmente clicáveis em vez de levarem a 404.

## Sprint atual (avaliação)

O repositório está no meio do que o roadmap chama de **Release 0.3 (Domínio de Loja)** com resíduos do **Release 0.4 (Busca)** já começados em paralelo, mas nenhum dos dois fechado. Release 0.2 (Produto) está concluído. Release 0.1/Sprint 0 (fundação) está concluído, apesar de `docs/PROJECT_STATUS.md` anterior dizer o contrário — esse documento estava desatualizado (substituído nesta auditoria).

**Sprint que acredito estarmos**: Sprint 3.x / Release 0.3 (Domínio de Loja), iniciado mas não finalizado — `StoreCard` pronto, `StoreGrid`/`StoreDetails`/`useStore`/rota `/store/[slug]` pendentes.

**Próxima sprint recomendada**: fechar o Release 0.3 (Loja) antes de avançar para 0.4 (Busca), mesmo que a Busca já tenha UI parcial — evita ter três domínios "pela metade" simultaneamente.

---

## Roadmap proposto (próximos passos imediatos)

### Sprint A — Fechar o Domínio de Loja (Release 0.3)
- **Prioridade**: 🔴 Alta
- **Risco**: Baixo (padrão já estabelecido pelo Domínio de Produto, é replicar a fórmula)
- **Complexidade**: Média
- **Estimativa**: 3–4 dias
- Tarefas: implementar `hooks/useStore.ts`, `components/store/StoreGrid.tsx`, `components/store/StoreDetails.tsx`, criar `app/store/[slug]/page.tsx` (+ `layout.tsx`/`loading.tsx`/`not-found.tsx` espelhando o de produto), decidir `getStore(id)` vs `getStoreBySlug(slug)` e ajustar `store.service.ts`, adicionar `storePath()`/`storeUrl()` em `constants/routes.ts`.

### Sprint B — Ligar a Busca de ponta a ponta (Release 0.4, parte 1)
- **Prioridade**: 🔴 Alta
- **Risco**: Médio (decisões de UX de filtros/ranking ainda não tomadas)
- **Complexidade**: Média
- **Estimativa**: 3–5 dias
- Tarefas: `app/search/page.tsx` ler `searchParams.q`, implementar `hooks/useSearch.ts` chamando `searchEverything`, `SearchResults` renderizar resultados reais agrupados por tipo (produtos/lojas/marcas), estado vazio/erro reais. Filtros, paginação, autocomplete ficam para uma segunda fase dentro do mesmo Release.

### Sprint C — Eliminar dívidas técnicas críticas antes de crescer mais
- **Prioridade**: 🟡 Média (mas crescente — quanto mais o código cresce, mais caro fica)
- **Risco**: Baixo
- **Complexidade**: Baixa–Média
- **Estimativa**: 1–2 dias (reduzida — unificação de `lib/supabase.ts`/`lib/env.ts` já concluída na Sprint 3.2, ver `docs/CHANGELOG.md`)
- Tarefas restantes: resolver o double-fetch de produto (mover fetch para o server, reduzir `app/product/[slug]/page.tsx` a ilhas client), trocar `<img>` por `next/image` nos 5 componentes apontados pelo lint, customizar `app/layout.tsx` (metadata real, não "Create Next App").

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
| UX | ★★★☆☆ | Home e produto têm boa execução visual; mas navegação tem múltiplos links mortos (`/stores`, `/products`, `/compare`, etc.) e busca não funciona — frustra o fluxo principal do produto. |
| SEO | ★★★☆☆ | Produto tem metadata+JSON-LD bem feitos; Home/raiz ainda com metadata padrão do template, sem sitemap/robots. |
| Performance | ★★★☆☆ | Sem otimizações graves visíveis, mas `<img>` em vez de `next/image` em 5 lugares, e fetch duplicado de produto a cada visita. |
| Escalabilidade | ★★★★☆ | Modelagem de dados (price na offer, não no produto) e separação em camadas são boas bases; falta apenas amadurecer hooks/services que ainda faltam. |
| Organização | ★★★★☆ | Estrutura de pastas clara e consistente; only ruído real é o volume de placeholders vazios sem marcação padronizada. |
| Código | ★★★★☆ | TypeScript estrito, convenções de service consistentes, zero erros de lint/TS; perde ponto pelos `as Tipo[]` sem validação. |
| Manutenibilidade | ★★★★☆ | Convenções claras e documentadas (`CLAUDE.md`), fácil para outro dev continuar; risco principal é justamente arquivo vazio parecendo implementado (causou o incidente de deploy desta sessão). |
| Prontidão para Produção | ★★☆☆☆ | Build/lint/TS passam e o deploy na Vercel foi corrigido, mas a maioria das rotas do menu não existe, busca não funciona e dados da Home são mockados — não está pronto para usuários reais ainda. |

**Média geral: ≈ 3,4/5** — fundação sólida, execução incompleta. Consistente com a estimativa de **30%** em `docs/PROJECT_STATUS.md`.
